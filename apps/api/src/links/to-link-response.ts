import type { LinkResponse } from '@shelfmark/contracts';
import type { LinkWithTags } from './models/link-with-tags.type';

/**
 * Maps a row to the contract. `faviconUrl` and `imageUrl` are `null` until the image capture
 * (#149, ADR 0027) stores same-origin copies; the source URLs in the row are never returned.
 */
export function toLinkResponse(row: LinkWithTags): LinkResponse {
  return {
    id: row.id,
    folderId: row.folderId,
    url: row.url,
    title: row.title,
    note: row.note,
    faviconUrl: null,
    imageUrl: null,
    isFavorite: row.isFavorite,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    tags: row.tags.map((entry) => entry.tag.name).sort((a, b) => a.localeCompare(b, 'en')),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
