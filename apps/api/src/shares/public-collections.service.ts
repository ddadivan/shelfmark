import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_IMAGE_KIND,
  SHARE_ERROR_MESSAGE,
  SHARE_LIMIT,
  SHARE_TOKEN_PATTERN,
  type LinkImageKind,
  type PublicCollectionFolder,
  type PublicCollectionQuery,
  type PublicCollectionResponse,
} from '@shelfmark/contracts';
import { LINK_IMAGE_SEGMENT } from '../links/images/link-image-path';
import type { StoredLinkImage } from '../links/images/models/stored-link-image.interface';
import { PrismaService } from '../prisma/prisma.service';
import { firstName } from './first-name';
import type { ResolvedShare } from './models/resolved-share.interface';
import type { SubtreeFolder } from './models/subtree-folder.interface';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION_LENGTH = 16;

/**
 * The anonymous side of public collections (#276, ADR 0040). A token is resolved with one indexed
 * equality lookup; anything that does not resolve (malformed, unknown, disabled, reset) and
 * anything outside the shared subtree is the same 404. Only what the page shows leaves the
 * service: the owner's first name, folder names and counts, link titles and URLs, notes only
 * when the owner turned them on, and same-origin image paths keyed by the token.
 */
@Injectable()
export class PublicCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async collection(token: string, query: PublicCollectionQuery): Promise<PublicCollectionResponse> {
    const share = await this.resolve(token);
    const [root] = share.folders;
    const ids = share.folders.map((folder) => folder.id);

    const scopeIds =
      query.folder === undefined ? ids : this.subtreeIdsOf(share.folders, query.folder);
    if (scopeIds === null) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);

    const page = query.page ?? 1;
    const skip = (page - 1) * SHARE_LIMIT.PageSize;
    const take = Math.max(0, Math.min(SHARE_LIMIT.PageSize, SHARE_LIMIT.MaxLinks - skip));
    // Trash (ADR 0036): a deleted link or folder never shows on a public page.
    const where = { userId: share.userId, folderId: { in: scopeIds }, deletedAt: null };

    const [perFolder, latest, scopeTotal, rows] = await this.prisma.$transaction([
      this.prisma.link.groupBy({
        by: ['folderId'],
        where: { userId: share.userId, folderId: { in: ids }, deletedAt: null },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      }),
      this.prisma.link.aggregate({
        where: { userId: share.userId, folderId: { in: ids }, deletedAt: null },
        _max: { updatedAt: true },
      }),
      this.prisma.link.count({ where }),
      this.prisma.link.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          url: true,
          title: true,
          note: true,
          images: { select: { kind: true, sha256: true } },
        },
      }),
    ]);

    const direct = new Map(perFolder.map((group) => [group.folderId, group._count._all]));
    const total = [...direct.values()].reduce((sum, count) => sum + count, 0);
    const updatedAt = [latest._max.updatedAt, ...share.folders.map((folder) => folder.updatedAt)]
      .filter((date): date is Date => date !== null)
      .reduce((max, date) => (date > max ? date : max));

    const imagePath = (
      linkId: string,
      images: { kind: string; sha256: string }[],
      kind: LinkImageKind,
    ): string | null => {
      const image = images.find((entry) => entry.kind === kind);
      return image
        ? `/api/public/collections/${token}/links/${linkId}/${LINK_IMAGE_SEGMENT[kind]}?v=${image.sha256.slice(0, VERSION_LENGTH)}`
        : null;
    };

    return {
      ownerName: share.ownerName,
      name: root.name,
      linkCount: total,
      updatedAt: updatedAt.toISOString(),
      subfolders: this.subfolders(share.folders, root.id, direct),
      items: rows.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        note: share.showNotes ? row.note : null,
        faviconUrl: imagePath(row.id, row.images, LINK_IMAGE_KIND.Favicon),
        imageUrl: imagePath(row.id, row.images, LINK_IMAGE_KIND.Preview),
      })),
      page,
      hasMore: skip + rows.length < Math.min(scopeTotal, SHARE_LIMIT.MaxLinks),
    };
  }

  /** A stored image of a link in the shared subtree; everything else is the collection 404. */
  async image(token: string, linkId: string, kind: LinkImageKind): Promise<StoredLinkImage> {
    if (!UUID.test(linkId)) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    const share = await this.resolve(token);
    const row = await this.prisma.linkImage.findFirst({
      where: {
        linkId,
        kind,
        userId: share.userId,
        link: {
          userId: share.userId,
          folderId: { in: share.folders.map((folder) => folder.id) },
          deletedAt: null,
        },
      },
      select: { contentType: true, bytes: true, sha256: true },
    });
    if (!row) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    return { contentType: row.contentType, bytes: Buffer.from(row.bytes), sha256: row.sha256 };
  }

  /**
   * The share of a token with its whole subtree, or the 404. The token is checked for shape first
   * (no query for garbage), then looked up by its unique index; the subtree query runs only for a
   * live share and never crosses to another user's folders.
   */
  private async resolve(token: string): Promise<ResolvedShare> {
    if (!SHARE_TOKEN_PATTERN.test(token)) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    const share = await this.prisma.folderShare.findUnique({
      where: { token },
      select: { userId: true, folderId: true, showNotes: true, user: { select: { name: true } } },
    });
    if (!share) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    const folders = await this.prisma.$queryRaw<SubtreeFolder[]>`
      WITH RECURSIVE subtree(id, parent_id, name, updated_at, depth) AS (
        SELECT f.id, f.parent_id, f.name, f.updated_at, 0
          FROM folders f
         WHERE f.id = ${share.folderId}::uuid AND f.user_id = ${share.userId}::uuid
           AND f.deleted_at IS NULL
        UNION ALL
        SELECT c.id, c.parent_id, c.name, c.updated_at, s.depth + 1
          FROM folders c
          JOIN subtree s ON c.parent_id = s.id
         WHERE c.user_id = ${share.userId}::uuid AND c.deleted_at IS NULL
      )
      SELECT id::text AS "id", parent_id::text AS "parentId", name AS "name",
             updated_at AS "updatedAt"
        FROM subtree
       ORDER BY depth, name, id`;
    if (folders.length === 0) throw new NotFoundException(SHARE_ERROR_MESSAGE.NotFound);
    return {
      userId: share.userId,
      folderId: share.folderId,
      showNotes: share.showNotes,
      ownerName: firstName(share.user.name),
      folders,
    };
  }

  /** `id` and its descendants, when `id` is in the shared subtree; otherwise `null`. */
  private subtreeIdsOf(folders: readonly SubtreeFolder[], id: string): string[] | null {
    if (!folders.some((folder) => folder.id === id)) return null;
    const ids = [id];
    for (const current of ids) {
      for (const folder of folders) {
        if (folder.parentId === current) ids.push(folder.id);
      }
    }
    return ids;
  }

  /** The direct subfolders of the root by name, each counting the links of its own subtree. */
  private subfolders(
    folders: readonly SubtreeFolder[],
    rootId: string,
    direct: ReadonlyMap<string | null, number>,
  ): PublicCollectionFolder[] {
    return folders
      .filter((folder) => folder.parentId === rootId)
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        linkCount: (this.subtreeIdsOf(folders, folder.id) ?? []).reduce(
          (sum, id) => sum + (direct.get(id) ?? 0),
          0,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
  }
}
