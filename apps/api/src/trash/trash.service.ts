import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_IMAGE_KIND,
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  TRASH_RETENTION_DAYS,
  TRASH_RETENTION_DEFAULT,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItem,
  type TrashItemRef,
  type TrashRetentionDays,
} from '@shelfmark/contracts';
import { FoldersService } from '../folders/folders.service';
import type { Prisma } from '../generated/prisma/client';
import { imagePath } from '../links/to-link-response';
import { PrismaService } from '../prisma/prisma.service';
import type { TrashDbClient } from './models/trash-db-client.type';
import type { TrashEntryRow } from './models/trash-entry-row.interface';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The one value of `TRASH_RETENTION_DAYS` a stored number is, else the default (the CHECK forbids others). */
export function toRetentionDays(value: number): TrashRetentionDays {
  return TRASH_RETENTION_DAYS.find((days) => days === value) ?? TRASH_RETENTION_DEFAULT;
}

/**
 * Trash of the session user (ADR 0036). A link is an entry when its folder is not in Trash with the
 * same `deleted_at` (live, gone or deleted at another time); a folder is an entry when its parent is
 * not in Trash with the same `deleted_at`. Writes run under the `folders:` advisory lock, so they
 * are serialized against folder moves and deletes. Plain SQL keeps `updated_at` as it is: moving
 * in and out of Trash is not an edit. Every statement filters by the session `userId`.
 */
@Injectable()
export class TrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folders: FoldersService,
  ) {}

  async list(userId: string): Promise<ListTrashResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trashRetentionDays: true },
    });
    if (!user) throw new NotFoundException();
    const retentionDays = toRetentionDays(user.trashRetentionDays);

    const entries = await this.prisma.$queryRaw<TrashEntryRow[]>`
      WITH entries AS (
        SELECT 'link' AS kind, l.id::text AS id, l.deleted_at AS "deletedAt"
        FROM links l
          LEFT JOIN folders f ON f.id = l.folder_id AND f.user_id = l.user_id
        WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NOT NULL
          AND (f.id IS NULL OR f.deleted_at IS NULL OR f.deleted_at <> l.deleted_at)
        UNION ALL
        SELECT 'folder' AS kind, d.id::text AS id, d.deleted_at AS "deletedAt"
        FROM folders d
          LEFT JOIN folders p ON p.id = d.parent_id AND p.user_id = d.user_id
        WHERE d.user_id = ${userId}::uuid AND d.deleted_at IS NOT NULL
          AND (p.id IS NULL OR p.deleted_at IS NULL OR p.deleted_at <> d.deleted_at)
      )
      SELECT kind, id, "deletedAt", (count(*) OVER ())::int AS total
      FROM entries
      ORDER BY "deletedAt" DESC, id DESC
      LIMIT ${TRASH_LIMIT.ListMax}`;
    if (entries.length === 0) return { items: [], total: 0, retentionDays };

    const linkIds = entries.filter((e) => e.kind === TRASH_ITEM_KIND.Link).map((e) => e.id);
    const folderIds = entries.filter((e) => e.kind === TRASH_ITEM_KIND.Folder).map((e) => e.id);
    const [links, folders, counts] = await Promise.all([
      this.prisma.link.findMany({
        where: { id: { in: linkIds }, userId, deletedAt: { not: null } },
        select: {
          id: true,
          title: true,
          url: true,
          captureAttemptedAt: true,
          images: { select: { kind: true, sha256: true } },
          folder: { select: { name: true } },
        },
      }),
      this.prisma.folder.findMany({
        where: { id: { in: folderIds }, userId, deletedAt: { not: null } },
        select: { id: true, name: true, parent: { select: { name: true } } },
      }),
      this.linkCounts(userId, folderIds),
    ]);
    const linkById = new Map(links.map((row) => [row.id, row]));
    const folderById = new Map(folders.map((row) => [row.id, row]));

    const items: TrashItem[] = [];
    for (const entry of entries) {
      const expiresAt = new Date(entry.deletedAt.getTime() + retentionDays * MS_PER_DAY);
      const common = {
        deletedAt: entry.deletedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      if (entry.kind === TRASH_ITEM_KIND.Link) {
        const row = linkById.get(entry.id);
        if (!row) continue; // removed by a concurrent request between the two reads
        items.push({
          kind: TRASH_ITEM_KIND.Link,
          id: row.id,
          title: row.title,
          url: row.url,
          faviconUrl: imagePath(row, LINK_IMAGE_KIND.Favicon),
          imageUrl: imagePath(row, LINK_IMAGE_KIND.Preview),
          fromFolderName: row.folder?.name ?? null,
          linkCount: null,
          ...common,
        });
      } else {
        const row = folderById.get(entry.id);
        if (!row) continue;
        items.push({
          kind: TRASH_ITEM_KIND.Folder,
          id: row.id,
          title: row.name,
          url: null,
          faviconUrl: null,
          imageUrl: null,
          fromFolderName: row.parent?.name ?? null,
          linkCount: counts.get(row.id) ?? 0,
          ...common,
        });
      }
    }
    return { items, total: entries[0]?.total ?? 0, retentionDays };
  }

  /** Puts the entries back (ADR 0036 point 3). Entries not in Trash or not the user's are skipped. */
  async restore(userId: string, refs: readonly TrashItemRef[]): Promise<TrashActionResponse> {
    // Restoring changes no row count, so the per-user limits (which count Trash) cannot be exceeded.
    return this.inLockedTransaction(userId, async (tx) => {
      let count = 0;
      for (const ref of unique(refs)) {
        const handled =
          ref.kind === TRASH_ITEM_KIND.Link
            ? await this.restoreLink(tx, userId, ref.id)
            : await this.restoreFolder(tx, userId, ref.id);
        if (handled) count += 1;
      }
      return { count };
    });
  }

  /** Deletes the entries for good (point 4). Entries not in Trash or not the user's are skipped. */
  async remove(userId: string, refs: readonly TrashItemRef[]): Promise<TrashActionResponse> {
    return this.inLockedTransaction(userId, async (tx) => {
      let count = 0;
      for (const ref of unique(refs)) {
        const handled =
          ref.kind === TRASH_ITEM_KIND.Link
            ? await this.removeLink(tx, userId, ref.id)
            : await this.removeFolder(tx, userId, ref.id);
        if (handled) count += 1;
      }
      return { count };
    });
  }

  /** "Empty trash": every trashed row of the user goes; `count` is the number of entries. */
  async empty(userId: string): Promise<TrashActionResponse> {
    return this.inLockedTransaction(userId, async (tx) => {
      const [{ count }] = await tx.$queryRaw<{ count: number }[]>`
        SELECT count(*)::int AS count FROM (
          SELECT l.id FROM links l
            LEFT JOIN folders f ON f.id = l.folder_id AND f.user_id = l.user_id
          WHERE l.user_id = ${userId}::uuid AND l.deleted_at IS NOT NULL
            AND (f.id IS NULL OR f.deleted_at IS NULL OR f.deleted_at <> l.deleted_at)
          UNION ALL
          SELECT d.id FROM folders d
            LEFT JOIN folders p ON p.id = d.parent_id AND p.user_id = d.user_id
          WHERE d.user_id = ${userId}::uuid AND d.deleted_at IS NOT NULL
            AND (p.id IS NULL OR p.deleted_at IS NULL OR p.deleted_at <> d.deleted_at)
        ) entries`;
      // Links first: they only reference folders with SET NULL, folders cascade to subfolders.
      await tx.link.deleteMany({ where: { userId, deletedAt: { not: null } } });
      await tx.folder.deleteMany({ where: { userId, deletedAt: { not: null } } });
      return { count: count ?? 0 };
    });
  }

  private inLockedTransaction<T>(
    userId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await this.folders.lockTree(tx, userId);
      return work(tx);
    });
  }

  /** A link comes back; its folder is kept only when that folder is live, else Unsorted. */
  private async restoreLink(tx: TrashDbClient, userId: string, id: string): Promise<boolean> {
    const touched = await tx.$executeRaw`
      UPDATE links SET deleted_at = NULL,
        folder_id = CASE
          WHEN folder_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM folders f
            WHERE f.id = links.folder_id AND f.user_id = ${userId}::uuid AND f.deleted_at IS NULL
          ) THEN NULL
          ELSE folder_id END
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NOT NULL`;
    return touched > 0;
  }

  /**
   * A folder comes back with the subfolders and links that share its `deleted_at`; at the top
   * level when its parent is not live.
   */
  private async restoreFolder(tx: TrashDbClient, userId: string, id: string): Promise<boolean> {
    const root = await tx.folder.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { deletedAt: true },
    });
    if (!root?.deletedAt) return false;
    const ids = await this.sharedSubtree(tx, userId, id, root.deletedAt);
    await tx.$executeRaw`
      UPDATE links SET deleted_at = NULL
      WHERE user_id = ${userId}::uuid AND deleted_at = ${root.deletedAt}
        AND folder_id = ANY(${ids}::uuid[])`;
    await tx.$executeRaw`
      UPDATE folders SET deleted_at = NULL,
        parent_id = CASE
          WHEN id = ${id}::uuid AND parent_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM folders p
            WHERE p.id = folders.parent_id AND p.user_id = ${userId}::uuid AND p.deleted_at IS NULL
          ) THEN NULL
          ELSE parent_id END
      WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])`;
    return true;
  }

  private async removeLink(tx: TrashDbClient, userId: string, id: string): Promise<boolean> {
    const result = await tx.link.deleteMany({ where: { id, userId, deletedAt: { not: null } } });
    return result.count > 0;
  }

  /**
   * The folder, its subfolders (cascade) and the links deleted with it go. A link deleted on its own
   * earlier inside it loses the folder (SET NULL) and stays in Trash as its own entry.
   */
  private async removeFolder(tx: TrashDbClient, userId: string, id: string): Promise<boolean> {
    const root = await tx.folder.findFirst({
      where: { id, userId, deletedAt: { not: null } },
      select: { deletedAt: true },
    });
    if (!root?.deletedAt) return false;
    const ids = await this.sharedSubtree(tx, userId, id, root.deletedAt);
    await tx.link.deleteMany({
      where: { userId, deletedAt: root.deletedAt, folderId: { in: ids } },
    });
    await tx.folder.deleteMany({ where: { id, userId } });
    return true;
  }

  /** The folder and its descendants that were deleted at exactly `deletedAt`. */
  private async sharedSubtree(
    tx: TrashDbClient,
    userId: string,
    id: string,
    deletedAt: Date,
  ): Promise<string[]> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree(id) AS (
        SELECT f.id FROM folders f
        WHERE f.id = ${id}::uuid AND f.user_id = ${userId}::uuid AND f.deleted_at = ${deletedAt}
        UNION ALL
        SELECT c.id FROM folders c
          JOIN subtree s ON c.parent_id = s.id
        WHERE c.user_id = ${userId}::uuid AND c.deleted_at = ${deletedAt}
      )
      SELECT id::text AS id FROM subtree`;
    return rows.map((row) => row.id);
  }

  /** Per folder entry: the links deleted with it (same `deleted_at`), subfolders included. */
  private async linkCounts(
    userId: string,
    folderIds: readonly string[],
  ): Promise<Map<string, number>> {
    if (folderIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ id: string; count: number }[]>`
      WITH RECURSIVE subtree(root, id, ts) AS (
        SELECT f.id, f.id, f.deleted_at FROM folders f
        WHERE f.id = ANY(${folderIds}::uuid[]) AND f.user_id = ${userId}::uuid
          AND f.deleted_at IS NOT NULL
        UNION ALL
        SELECT s.root, c.id, s.ts FROM folders c
          JOIN subtree s ON c.parent_id = s.id
        WHERE c.user_id = ${userId}::uuid AND c.deleted_at = s.ts
      )
      SELECT s.root::text AS id, count(l.id)::int AS count
      FROM subtree s
        JOIN links l ON l.folder_id = s.id AND l.user_id = ${userId}::uuid AND l.deleted_at = s.ts
      GROUP BY s.root`;
    return new Map(rows.map((row) => [row.id, row.count]));
  }
}

/** The same entry named twice is handled once. */
function unique(refs: readonly TrashItemRef[]): TrashItemRef[] {
  return [...new Map(refs.map((ref) => [`${ref.kind}:${ref.id}`, ref])).values()];
}
