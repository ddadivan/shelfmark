import type { CursorQuery } from '../pagination/cursor-query.interface';
import type { SortOrder } from '../pagination/sort-order.type';
import type { LinkSortField } from './link-sort-field.type';

/** `GET /api/links` query. Booleans and numbers arrive as strings and are coerced by the API. */
export interface ListLinksQuery extends CursorQuery {
  folderId?: string;
  /** Only links without a folder; cannot be combined with `folderId`. */
  unsorted?: boolean;
  favorite?: boolean;
  /** Tag name. */
  tag?: string;
  /** Title search. */
  q?: string;
  /** Defaults to `LINK_SORT_FIELD.CreatedAt`. */
  sort?: LinkSortField;
  /** Defaults to `SORT_ORDER.Desc`. */
  order?: SortOrder;
}
