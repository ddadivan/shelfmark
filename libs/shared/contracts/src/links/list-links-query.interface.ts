import type { CursorQuery } from '../pagination/cursor-query.interface';
import type { SortOrder } from '../pagination/sort-order.type';
import type { LinkKind } from './link-kind.type';
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
   * parsed to `['a']`. Empty or absent means no filter, duplicates are collapsed, and each value
   * is normalized with `normalizeTagName` before matching.
   */
  tag?: string[];
  /**
   * Search in title, note and URL, case-insensitive. At most `LINK_LIMIT.QueryMax` characters;
   * the words are separated by white space, every word must match (AND), at most 5 words.
   */
  q?: string;
  /** Only links of this kind (one value). */
  kind?: LinkKind;
  /** Defaults to `LINK_SORT_FIELD.CreatedAt`. */
  sort?: LinkSortField;
  /** Defaults to `SORT_ORDER.Desc`. */
  order?: SortOrder;
}
