import type { LinkSortField, SortOrder } from '@shelfmark/contracts';

/** The query parameters of the library page, common to every scope. */
export interface LinksFilterOptions {
  /** Tag names; a link must have all of them. */
  readonly tags?: readonly string[];
  /** Title search. */
  readonly q?: string;
  readonly sort?: LinkSortField;
  readonly order?: SortOrder;
}
