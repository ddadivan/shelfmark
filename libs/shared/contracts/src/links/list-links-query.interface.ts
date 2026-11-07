import type { CursorQuery } from '../pagination/cursor-query.interface';
import type { SortOrder } from '../pagination/sort-order.type';
import type { LinkSortField } from './link-sort-field.type';

/** `GET /api/links` query. The handler sees the parsed values: booleans and numbers, not strings. */
export interface ListLinksQuery extends CursorQuery {
  /** UUID of a folder. */
  folderId?: string;
  /** Only links without a folder; cannot be combined with `folderId`. */
  unsorted?: boolean;
  favorite?: boolean;
  /**
   * Tag names (repeated parameter `?tag=a&tag=b`), matched case-insensitively; a link must have
   * all of them (AND). At most `LINK_LIMIT.TagFilterMax`, more is a 400. A single `?tag=a` is
   * parsed to `['a']`.
   */
  tag?: string[];
  /** Title search, at most `LINK_LIMIT.QueryMax` characters. */
  q?: string;
  /** Defaults to `LINK_SORT_FIELD.CreatedAt`. */
  sort?: LinkSortField;
  /** Defaults to `SORT_ORDER.Desc`. */
  order?: SortOrder;
}
