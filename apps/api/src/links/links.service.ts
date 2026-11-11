import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_LIMIT,
  LINK_SORT_FIELD,
  normalizeUrl,
  PAGE_LIMIT,
  RECENT_LINKS_WINDOW_DAYS,
  SORT_ORDER,
  type GetLinkResponse,
  LINK_ERROR_MESSAGE,
  type ListLinksQuery,
  type LinkDuplicate,
  type LinkPreviewResponse,
  type ListLinksResponse,
  type RecentLinksQuery,
  type RecentLinksResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { cursorKey, cursorWhere, decodeCursor, encodeCursor, linkOrderBy } from './link-cursor';
import { fallbackPreview } from '../preview/extract-preview';
import { LinkPreviewService } from './link-preview.service';
import { readLinkSavePrefs, savedUrl } from './link-save-prefs';
import { buildLinkWhere } from './link-where';
import { LINK_CURSOR_VERSION } from './models/link-cursor-version.const';
import { LINK_INCLUDE } from './models/link-include.const';
import { toLinkResponse } from './to-link-response';

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previews: LinkPreviewService,
  ) {}

  /**
   * Preview of a URL plus the user's existing link for it (matched by normalized URL, also for the
   * final URL after redirects). The page is fetched without any database work around it.
   */
  async preview(userId: string, sentUrl: string): Promise<LinkPreviewResponse> {
    // Settings › Library (#284): the address as it would be saved; with "Fetch titles and
    // previews" off the page is not loaded at all, and only the duplicate check runs.
    const prefs = await readLinkSavePrefs(this.prisma, userId);
    const url = savedUrl(sentUrl, prefs);
    const { preview, fetched } = prefs.fetchPreviews
      ? await this.previews.load(url)
      : { preview: fallbackPreview(url), fetched: false };
    const normalized = [...new Set([normalizeUrl(url), normalizeUrl(preview.url)])];
    const existing = await this.prisma.link.findFirst({
      where: { userId, deletedAt: null, normalizedUrl: { in: normalized } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        folderId: true,
        folder: { select: { name: true } },
      },
    });
    const duplicate: LinkDuplicate | null = existing && {
      id: existing.id,
      title: existing.title,
      folderId: existing.folderId,
      folderName: existing.folder?.name ?? null,
    };
    return { preview, duplicate, fetched };
  }

  async list(userId: string, query: ListLinksQuery): Promise<ListLinksResponse> {
    if (query.unsorted === true && query.folderId !== undefined) {
      throw new BadRequestException(LINK_ERROR_MESSAGE.FolderAndUnsorted);
    }
    const sort = query.sort ?? LINK_SORT_FIELD.CreatedAt;
    const order = query.order ?? SORT_ORDER.Desc;
    const limit = query.limit ?? PAGE_LIMIT.Default;
    const base = buildLinkWhere(userId, query);
    // In a folder the pinned links are the separate `pinned` array of page one; the keyset list holds
    // only the unpinned ones, so its cursor never has to know about pins.
    const inFolder = query.folderId !== undefined && query.unsorted !== true;
    const unpinned: Prisma.LinkWhereInput = inFolder
      ? { AND: [base, { pinnedInFolderAt: null }] }
      : base;
    const where =
      query.cursor === undefined
        ? unpinned
        : { AND: [unpinned, cursorWhere(decodeCursor(query.cursor, sort, order))] };
    const pinned =
      inFolder && query.cursor === undefined
        ? await this.prisma.link.findMany({
            where: { AND: [base, { pinnedInFolderAt: { not: null } }] },
            include: LINK_INCLUDE,
            orderBy: [{ pinnedInFolderAt: 'asc' }, { id: 'asc' }],
            take: LINK_LIMIT.PinnedInFolderMax,
          })
        : [];

    // One extra row tells whether another page exists; it is never returned.
    const rows = await this.prisma.link.findMany({
      where,
      include: LINK_INCLUDE,
      orderBy: linkOrderBy(sort, order),
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor =
      rows.length > limit && last !== undefined
        ? encodeCursor({
            v: LINK_CURSOR_VERSION,
            s: sort,
            o: order,
            k: cursorKey(sort, last),
            id: last.id,
          })
        : null;
    return { items: page.map(toLinkResponse), nextCursor, pinned: pinned.map(toLinkResponse) };
  }

  async recent(userId: string, query: RecentLinksQuery): Promise<RecentLinksResponse> {
    const since = new Date(Date.now() - RECENT_LINKS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, lastOpenedAt: { gte: since } },
      include: LINK_INCLUDE,
      orderBy: [{ lastOpenedAt: 'desc' }, { id: 'desc' }],
      take: query.limit ?? PAGE_LIMIT.Default,
    });
    return { items: rows.map(toLinkResponse) };
  }

  async get(userId: string, id: string): Promise<GetLinkResponse> {
    const row = await this.prisma.link.findFirst({
      where: { id, userId, deletedAt: null },
      include: LINK_INCLUDE,
    });
    if (!row) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    return toLinkResponse(row);
  }
}
