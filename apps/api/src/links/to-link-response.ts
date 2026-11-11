import { LINK_IMAGE_KIND, type LinkImageKind, type LinkResponse } from '@shelfmark/contracts';
import { linkImagePath } from './images/link-image-path';
import type { LinkWithTags } from './models/link-with-tags.type';

/**
 * The same-origin path of the stored image of a kind. A link whose capture is pending (its page
 * changed) gets the path with `v=pending`: requesting it triggers the lazy re-capture (a 404 shows
 * the letter). `null` when nothing was captured and nothing is pending.
 */
export function imagePath(
  row: Pick<LinkWithTags, 'id' | 'images' | 'captureAttemptedAt'>,
  kind: LinkImageKind,
): string | null {
  const image = row.images.find((entry) => entry.kind === kind);
  if (image) return linkImagePath(row.id, kind, image.sha256);
  return row.captureAttemptedAt === null ? linkImagePath(row.id, kind) : null;
}

/**
 * Maps a row to the contract. `faviconUrl` and `imageUrl` are same-origin paths to the captured
 * copies (ADR 0027) or `null`; the remote source URLs in the row are never returned.
 */
export function toLinkResponse(row: LinkWithTags): LinkResponse {
  return {
    id: row.id,
    folderId: row.folderId,
    url: row.url,
    title: row.title,
    note: row.note,
    faviconUrl: imagePath(row, LINK_IMAGE_KIND.Favicon),
    imageUrl: imagePath(row, LINK_IMAGE_KIND.Preview),
    isFavorite: row.isFavorite,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    tags: row.tags.map((entry) => entry.tag.name).sort((a, b) => a.localeCompare(b, 'en')),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
