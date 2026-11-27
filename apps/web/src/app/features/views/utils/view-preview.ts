import type { ListLinksQuery, ListLinksResponse, SavedViewQuery } from '@shelfmark/contracts';
import { displayHost } from '@shelfmark/contracts';
import { NEW_VIEW_PREVIEW } from '../models/new-view-preview.const';
import type { ViewPreview } from '../models/view-preview.interface';
import { listQueryOf } from './saved-view-query';

/** The list request behind the live count: the view's filters and sort, one big page. */
export function previewQueryOf(query: SavedViewQuery): ListLinksQuery {
  return {
    ...listQueryOf(query),
    sort: query.sort,
    order: query.order,
    limit: NEW_VIEW_PREVIEW.Limit,
  };
}

/**
 * What the answer says: the links of the page (a folder's pinned links first, as the feed shows
 * them), whether more follow, and the first rows. `folderName` names a folder id.
 */
export function previewOf(
  response: ListLinksResponse,
  folderName: (id: string) => string | null,
): ViewPreview {
  const links = [...response.pinned, ...response.items];
  return {
    count: links.length,
    more: response.nextCursor !== null,
    rows: links.slice(0, NEW_VIEW_PREVIEW.Rows).map((link) => ({
      id: link.id,
      title: link.title,
      host: displayHost(link.url),
      folder: link.folderId === null ? null : folderName(link.folderId),
      faviconUrl: link.faviconUrl,
    })),
  };
}
