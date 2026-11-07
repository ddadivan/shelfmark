import { Readable } from 'node:stream';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EXPORT_FORMAT, EXPORT_SCHEMA_VERSION, normalizeTagName } from '@shelfmark/contracts';
import type { ExportFolder, ExportLink, ExportQuery } from '@shelfmark/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
const JSON_TYPE = 'application/json; charset=utf-8';
const HTML_TYPE = 'text/html; charset=utf-8';

const LINK_SELECT = {
  id: true,
  url: true,
  title: true,
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates the scope (a foreign or missing folder is a 404) and returns the file; the body is
   * produced lazily in batches so a large library never sits in memory at once.
   */
  async prepare(userId: string, query: ExportQuery, now = new Date()): Promise<ExportFile> {
    const allFolders = await this.prisma.folder.findMany({
      where: { userId },
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
    const filtered = (query.tag?.length ?? 0) > 0 || (query.q ?? '').trim() !== '';
    const folders = filtered ? await this.nonEmpty(scope, byId, base) : scope;

    const date = now.toISOString().slice(0, 10);
    if (query.format === EXPORT_FORMAT.Json) {
      return {
        filename: `shelfmark-${date}.json`,
        contentType: JSON_TYPE,
        body: Readable.from(this.jsonChunks(folders, byId, base, now)),
      };
    }
    return {
      filename: `shelfmark-${date}.html`,
      contentType: HTML_TYPE,
      body: Readable.from(this.htmlChunks(folders, query.folderId, base)),
    };
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
    const tags = [
      ...new Map(
        (query.tag ?? [])
          .map(normalizeTagName)
          .filter((name) => name !== '')
          .map((name) => [name.toLowerCase(), name] as const),
      ).values(),
    ];
    // Prisma passes `contains` through as LIKE `%value%` without escaping wildcards: escape them.
    const search = (query.q ?? '').trim().replace(/[\\%_]/g, (char) => `\\${char}`);
    const and: Prisma.LinkWhereInput[] = tags.map((name) => ({
      tags: { some: { tag: { userId, name: { equals: name, mode: 'insensitive' } } } },
    }));
    if (search !== '') {
      // `contains` escapes LIKE wildcards itself; the value is always a bound parameter.
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } },
          { url: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    return {
      userId,
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
      children.set(key, [...(children.get(key) ?? []), folder]);
    }
    yield BOOKMARKS_HEAD;
    if (rootId === undefined) {
      yield* this.folderLinks(base, null, 1);
    }
    yield* this.folderTree(children, null, base, 1);
    yield BOOKMARKS_TAIL;
  }

  private async *folderTree(
    children: Map<string | null, ExportFolderRow[]>,
    parent: string | null,
    base: Prisma.LinkWhereInput,
    depth: number,
  ): AsyncGenerator<string> {
    for (const folder of children.get(parent) ?? []) {
      yield renderFolderOpen(folder, depth);
      yield* this.folderLinks(base, folder.id, depth + 1);
      yield* this.folderTree(children, folder.id, base, depth + 1);
      yield renderFolderClose(depth);
    }
  }

  private async *folderLinks(
    base: Prisma.LinkWhereInput,
    folderId: string | null,
    depth: number,
  ): AsyncGenerator<string> {
    for await (const batch of this.linkBatches({ AND: [base, { folderId }] })) {
      yield batch.map((row) => renderBookmark(row, depth)).join('');
    }
  }
}
