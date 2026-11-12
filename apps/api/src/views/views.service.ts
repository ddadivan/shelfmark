import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SAVED_VIEW_ERROR_MESSAGE,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  type CreateSavedViewRequest,
  type ListSavedViewsQuery,
  type ListSavedViewsResponse,
  type SavedViewQuery,
  type SavedViewResponse,
  type UpdateSavedViewRequest,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import type { LinkDbClient } from '../links/models/link-db-client.type';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SAVED_VIEW_QUERY } from './models/default-saved-view-query.const';
import { SAVED_VIEW_LOCK_PREFIX } from './models/saved-view-lock.const';
import type { SavedViewRow } from './models/saved-view-row.interface';
import { countViews } from './saved-view-counts';
import { normalizeSavedViewQuery, parseStoredQuery } from './saved-view-query';

/** The feed of a list request as a view query (kind, search and sort left out), or none. */
function feedOf(query: ListSavedViewsQuery): SavedViewQuery | undefined {
  if (query.scope === undefined && query.folderId === undefined && !query.tag?.length) {
    return undefined;
  }
  const scope =
    query.scope ?? (query.folderId === undefined ? SAVED_VIEW_SCOPE.All : SAVED_VIEW_SCOPE.Folder);
  if (scope === SAVED_VIEW_SCOPE.Folder && query.folderId === undefined) {
    throw new BadRequestException(SAVED_VIEW_ERROR_MESSAGE.FeedFolderRequired);
  }
  if (scope !== SAVED_VIEW_SCOPE.Folder && query.folderId !== undefined) {
    throw new BadRequestException(SAVED_VIEW_ERROR_MESSAGE.FolderNotAllowed);
  }
  return {
    ...DEFAULT_SAVED_VIEW_QUERY,
    scope,
    folderId: query.folderId?.toLowerCase() ?? null,
    tags: [...(query.tag ?? [])],
  };
}

const VIEW_SELECT = { id: true, name: true, query: true, position: true } as const;

/**
 * Saved views (#264, ADR 0038): named filters of one user, at most `SAVED_VIEW_LIMIT.PerUserMax`,
 * in their own order. Writes run under the per-user `views:` advisory lock (it is never taken with
 * another lock), so the cap and the positions cannot be raced. A folder view needs one of the
 * user's live folders when it is written; a folder that later goes to Trash makes the view
 * unavailable (count 0) until it is restored. Counts come from one grouped query.
 */
@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The views with their counts. A feed (`scope`, `folderId`, `tag`, #335) narrows `total` and
   * every count to that feed; the folder of a folder feed needs no ownership check, because the
   * count only reads the caller's own links.
   */
  async list(userId: string, query: ListSavedViewsQuery = {}): Promise<ListSavedViewsResponse> {
    return this.load(this.prisma, userId, feedOf(query));
  }

  async create(userId: string, request: CreateSavedViewRequest): Promise<SavedViewResponse> {
    const query = normalizeSavedViewQuery(request.query);
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId);
      await this.requireFolder(tx, userId, query);
      const rows = await tx.savedView.findMany({ where: { userId }, select: { position: true } });
      if (rows.length >= SAVED_VIEW_LIMIT.PerUserMax) {
        throw new ConflictException(SAVED_VIEW_ERROR_MESSAGE.LimitReached);
      }
      const position = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
      const row = await tx.savedView.create({
        data: { userId, name: request.name, query: { ...query }, position },
        select: VIEW_SELECT,
      });
      return this.one(tx, userId, row);
    });
  }

  async update(
    userId: string,
    id: string,
    request: UpdateSavedViewRequest,
  ): Promise<SavedViewResponse> {
    const query = request.query === undefined ? undefined : normalizeSavedViewQuery(request.query);
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId);
      const current = await tx.savedView.findFirst({ where: { id, userId }, select: { id: true } });
      if (!current) throw new NotFoundException(SAVED_VIEW_ERROR_MESSAGE.NotFound);
      if (query !== undefined) await this.requireFolder(tx, userId, query);
      const row = await tx.savedView.update({
        where: { id, userId },
        data: {
          ...(request.name === undefined ? {} : { name: request.name }),
          ...(query === undefined ? {} : { query: { ...query } }),
        },
        select: VIEW_SELECT,
      });
      return this.one(tx, userId, row);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.savedView.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException(SAVED_VIEW_ERROR_MESSAGE.NotFound);
  }

  async reorder(userId: string, ids: readonly string[]): Promise<ListSavedViewsResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId);
      const rows = await tx.savedView.findMany({ where: { userId }, select: { id: true } });
      const wanted = ids.map((id) => id.toLowerCase());
      const unique = new Set(wanted);
      const same =
        unique.size === wanted.length &&
        wanted.length === rows.length &&
        rows.every((row) => unique.has(row.id));
      if (!same) throw new BadRequestException(SAVED_VIEW_ERROR_MESSAGE.OrderMismatch);
      for (const [position, id] of wanted.entries()) {
        await tx.savedView.update({ where: { id, userId }, data: { position } });
      }
      return this.load(tx, userId);
    });
  }

  private async lock(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${SAVED_VIEW_LOCK_PREFIX + userId}, 0))`;
  }

  /** A folder view must name one of the user's live folders: a foreign, missing or trashed one is 404. */
  private async requireFolder(
    db: LinkDbClient,
    userId: string,
    query: SavedViewQuery,
  ): Promise<void> {
    if (query.scope !== SAVED_VIEW_SCOPE.Folder || query.folderId === null) return;
    const folder = await db.folder.findFirst({
      where: { id: query.folderId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException(SAVED_VIEW_ERROR_MESSAGE.FolderNotFound);
  }

  private async load(
    db: LinkDbClient,
    userId: string,
    feed?: SavedViewQuery,
  ): Promise<ListSavedViewsResponse> {
    const rows = await db.savedView.findMany({
      where: { userId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: VIEW_SELECT,
    });
    return this.respond(db, userId, rows, feed);
  }

  private async one(
    db: LinkDbClient,
    userId: string,
    row: SavedViewRow,
  ): Promise<SavedViewResponse> {
    const { items } = await this.respond(db, userId, [row]);
    const [item] = items;
    if (item === undefined) throw new NotFoundException(SAVED_VIEW_ERROR_MESSAGE.NotFound);
    return item;
  }

  private async respond(
    db: LinkDbClient,
    userId: string,
    rows: readonly SavedViewRow[],
    feed?: SavedViewQuery,
  ): Promise<ListSavedViewsResponse> {
    const queries = rows.map((row) => parseStoredQuery(row.query));
    const folderIds = [
      ...new Set(queries.flatMap((query) => (query.folderId === null ? [] : [query.folderId]))),
    ];
    const live =
      folderIds.length === 0
        ? new Set<string>()
        : new Set(
            (
              await db.folder.findMany({
                where: { userId, deletedAt: null, id: { in: folderIds } },
                select: { id: true },
              })
            ).map((folder) => folder.id),
          );
    const available = queries.map(
      (query) =>
        query.scope !== SAVED_VIEW_SCOPE.Folder ||
        (query.folderId !== null && live.has(query.folderId)),
    );
    const { total, counts } = await countViews(
      db,
      userId,
      queries.map((query, index) => (available[index] ? query : null)),
      feed,
    );
    return {
      total,
      items: rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        query: queries[index] ?? parseStoredQuery(null),
        position: row.position,
        count: counts[index] ?? 0,
        available: available[index] ?? false,
      })),
    };
  }
}
