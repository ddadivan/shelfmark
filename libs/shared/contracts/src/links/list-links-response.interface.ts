import type { CursorPage } from '../pagination/cursor-page.interface';
import type { LinkResponse } from './link-response.interface';

/**
 * `GET /api/links` response. With `folderId`, the first page (no `cursor`) also carries `pinned`: the
 * links pinned to the top of that folder, in the order they were pinned, whatever the sort; they match
 * the same filters and are not repeated in `items` or on later pages (so the keyset cursor stays plain).
 * Without `folderId`, or on a later page, `pinned` is empty.
 */
export interface ListLinksResponse extends CursorPage<LinkResponse> {
  pinned: LinkResponse[];
}
