import { deriveLinkKind } from '@shelfmark/contracts';
import { ANY } from './any.const';

/** The expected `LinkResponse` of a freshly saved link (no folder, no tags, not opened), then `fields`. */
export function expectedLink(
  url: string,
  title: string,
  fields: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: ANY.id,
    kind: deriveLinkKind(url),
    folderId: null,
    url,
    title,
    note: null,
    faviconUrl: null,
    imageUrl: null,
    isFavorite: false,
    pinnedInFolderAt: null,
    pinned: false,
    lastOpenedAt: null,
    tags: [],
    createdAt: ANY.time,
    updatedAt: ANY.time,
    ...fields,
  };
}
