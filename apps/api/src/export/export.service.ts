import { toLinkKind } from '../links/to-link-kind';
import { Readable } from 'node:stream';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EXPORT_FORMAT, EXPORT_SCHEMA_VERSION, normalizeTagName } from '@shelfmark/contracts';
import type { ExportFolder, ExportLink, ExportQuery } from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXPORT_CONTENT_TYPE } from './models/export-content-type.const';
import type { ExportFile } from './models/export-file.interface';
import type { ExportFolderRow } from './models/export-folder-row.interface';
import type { ExportLinkRow } from './models/export-link-row.interface';
import {
  BOOKMARKS_HEAD,
  BOOKMARKS_TAIL,
  renderBookmark,
  renderFolderClose,
  renderFolderOpen,
} from './render-bookmarks';

const BATCH_SIZE = 500;

const LINK_SELECT = {
  id: true,
  url: true,
  title: true,
  kind: true,
  note: true,
  isFavorite: true,
  folderId: true,
  lastOpenedAt: true,
  createdAt: true,
  updatedAt: true,
  tags: { select: { tag: { select: { name: true } } }, orderBy: { tag: { name: 'asc' } } },
} satisfies Prisma.LinkSelect;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a failure after the response has started (the file is then truncated) without any user
   * data: only the error class, never its message, which may hold query values. Rethrows so the
   * stream is destroyed and the client sees an aborted download.
   */
  private async *guarded(chunks: AsyncGenerator<string>): AsyncGenerator<string> {
    try {
      yield* chunks;
    } catch (error) {
      this.logger.error(
        `Export stream failed: ${error instanceof Error ? error.constructor.name : 'unknown'}`,
      );
      throw error;
    }
  }

  /**
   * Validates the scope (a foreign or missing folder is a 404) and returns the file; the body is
   * produced lazily in batches so a large library never sits in memory at once.
   */
  async prepare(userId: string, query: ExportQuery, now = new Date()): Promise<ExportFile> {
    const allFolders = await this.prisma.folder.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, parentId: true, name: true, createdAt: true, updatedAt: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    const byId = new Map(allFolders.map((folder) => [folder.id, folder]));
    if (query.folderId !== undefined && !byId.has(query.folderId)) {
      throw new NotFoundException('Folder not found');
    }

    const scope = this.scopeOf(allFolders, query.folderId);
    const scopeIds = new Set(scope.map((folder) => folder.id));
    const base = this.baseWhere(userId, query, query.folderId === undefined ? null : scopeIds);
    const filtered =
      this.normalizedTags(query).length > 0 ||
      (query.q ?? '').trim() !== '' ||
      query.kind !== undefined;
    const folders = filtered ? await this.nonEmpty(scope, byId, base) : scope;

    const date = now.toISOString().slice(0, 10);
    if (query.format === EXPORT_FORMAT.Json) {
      return {
        filename: `shelfmark-${date}.json`,
        contentType: EXPORT_CONTENT_TYPE.Json,
        body: Readable.from(this.guarded(this.jsonChunks(folders, byId, base, now))),
      };
    }
    return {
      filename: `shelfmark-${date}.html`,
      contentType: EXPORT_CONTENT_TYPE.Html,
      body: Readable.from(this.guarded(this.htmlChunks(folders, query.folderId, base))),
    };
  }

  /** Tag filter values after normalisation: empty ones dropped, case-insensitive duplicates collapsed. */
  private normalizedTags(query: ExportQuery): string[] {
    return [
      ...new Map(
        (query.tag ?? [])
          .map(normalizeTagName)
          .filter((name) => name !== '')
          .map((name) => [name.toLowerCase(), name] as const),
      ).values(),
    ];
  }

  private scopeOf(all: ExportFolderRow[], rootId?: string): ExportFolderRow[] {
    if (rootId === undefined) return all;
    const included = new Set([rootId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const folder of all) {
        if (folder.parentId !== null && included.has(folder.parentId) && !included.has(folder.id)) {
          included.add(folder.id);
          grew = true;
        }
      }
    }
    return all.filter((folder) => included.has(folder.id));
  }

  private baseWhere(
    userId: string,
    query: ExportQuery,
    scopeIds: Set<string> | null,
  ): Prisma.LinkWhereInput {
    const tags = this.normalizedTags(query);
    // Prisma passes `contains` through as LIKE `%value%` without escaping wildcards: escape them.
    const search = (query.q ?? '').trim().replace(/[\\%_]/g, (char) => `\\${char}`);
    const and: Prisma.LinkWhereInput[] = tags.map((name) => ({
      tags: { some: { tag: { userId, name: { equals: name, mode: 'insensitive' } } } },
    }));
    if (search !== '') {
      // `search` has its LIKE wildcards escaped above; the value is always a bound parameter.
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } },
          { url: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.kind !== undefined) and.push({ kind: query.kind });
    return {
      userId,
      deletedAt: null,
      ...(scopeIds === null ? {} : { folderId: { in: [...scopeIds] } }),
      ...(and.length > 0 ? { AND: and } : {}),
    };
  }

  /** Folders that hold a match, or whose subtree does; empty ones are dropped when filtering. */
  private async nonEmpty(
    scope: ExportFolderRow[],
    byId: Map<string, ExportFolderRow>,
    base: Prisma.LinkWhereInput,
  ): Promise<ExportFolderRow[]> {
    const groups = await this.prisma.link.groupBy({ by: ['folderId'], where: base });
    const keep = new Set<string>();
    for (const group of groups) {
      let id: string | null = group.folderId;
      while (id !== null && !keep.has(id)) {
        keep.add(id);
        id = byId.get(id)?.parentId ?? null;
      }
    }
    return scope.filter((folder) => keep.has(folder.id));
  }

  private async *linkBatches(where: Prisma.LinkWhereInput): AsyncGenerator<ExportLinkRow[]> {
    let cursor: string | undefined;
    for (;;) {
      const rows: ExportLinkRow[] = await this.prisma.link.findMany({
        where,
        select: LINK_SELECT,
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor === undefined ? {} : { cursor: { id: cursor }, skip: 1 }),
      });
      if (rows.length === 0) return;
      yield rows;
      if (rows.length < BATCH_SIZE) return;
      cursor = rows[rows.length - 1]?.id;
    }
  }

  private pathOf(id: string, byId: Map<string, ExportFolderRow>): string[] {
    const path: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift(current.name);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    return path;
  }

  private async *jsonChunks(
    folders: ExportFolderRow[],
    byId: Map<string, ExportFolderRow>,
    where: Prisma.LinkWhereInput,
    now: Date,
  ): AsyncGenerator<string> {
    const exportFolders: ExportFolder[] = folders
      .map((folder) => ({
        path: this.pathOf(folder.id, byId),
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      }))
      .sort((a, b) => a.path.join('/').localeCompare(b.path.join('/')));
    yield `{"schemaVersion":${EXPORT_SCHEMA_VERSION},"exportedAt":${JSON.stringify(now.toISOString())},"folders":${JSON.stringify(exportFolders)},"links":[`;
    let first = true;
    for await (const batch of this.linkBatches(where)) {
      const parts = batch.map((row) => {
        const link: ExportLink = {
          url: row.url,
          title: row.title,
          kind: toLinkKind(row.kind),
          note: row.note,
          isFavorite: row.isFavorite,
          folderPath: row.folderId === null ? null : this.pathOf(row.folderId, byId),
          tags: row.tags.map((entry) => entry.tag.name),
          lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        };
        return JSON.stringify(link);
      });
      yield (first ? '' : ',') + parts.join(',');
      first = false;
    }
    yield ']}\n';
  }

  /**
   * One pass over the links (batched, ordered by id), grouped by folder in memory as
   * rendered text, then emitted in tree order. Memory is bounded by the per-user caps; the
   * database sees one query set, not one per folder.
   */
  private async *htmlChunks(
    folders: ExportFolderRow[],
    rootId: string | undefined,
    base: Prisma.LinkWhereInput,
  ): AsyncGenerator<string> {
    const children = new Map<string | null, ExportFolderRow[]>();
    const inScope = new Set(folders.map((folder) => folder.id));
    for (const folder of folders) {
      const key =
        folder.id === rootId || !inScope.has(folder.parentId ?? '') ? null : folder.parentId;
      const siblings = children.get(key);
      if (siblings) siblings.push(folder);
      else children.set(key, [folder]);
    }
    const depths = new Map<string | null, number>([[null, 1]]);
    const assign = (parent: string | null, depth: number): void => {
      for (const folder of children.get(parent) ?? []) {
        depths.set(folder.id, depth + 1);
        assign(folder.id, depth + 1);
      }
    };
    assign(null, 1);

    const rendered = new Map<string | null, string[]>();
    for await (const batch of this.linkBatches(base)) {
      for (const row of batch) {
        const text = renderBookmark(row, depths.get(row.folderId) ?? 1);
        if (text === '') continue;
        const texts = rendered.get(row.folderId);
        if (texts) texts.push(text);
        else rendered.set(row.folderId, [text]);
      }
    }

    yield BOOKMARKS_HEAD;
    yield* this.renderLevel(children, rendered, null, 1);
    yield BOOKMARKS_TAIL;
  }

  private *renderLevel(
    children: Map<string | null, ExportFolderRow[]>,
    rendered: Map<string | null, string[]>,
    parent: string | null,
    depth: number,
  ): Generator<string> {
    if (parent === null) yield (rendered.get(null) ?? []).join('');
    for (const folder of children.get(parent) ?? []) {
      yield renderFolderOpen(folder, depth);
      yield (rendered.get(folder.id) ?? []).join('');
      yield* this.renderLevel(children, rendered, folder.id, depth + 1);
      yield renderFolderClose(depth);
    }
  }
}
