import type { LinkKind, LinkSortField, SortOrder } from '@shelfmark/contracts';

/** The query parameters of the library page, common to every scope. */
export interface LinksFilterOptions {
  /** Tag names; a link must have all of them. */
  readonly tags?: readonly string[];
  /** Title search. */
  readonly q?: string;
  /** Only links of this kind (`?kind=video`). */
  readonly kind?: LinkKind;
  readonly sort?: LinkSortField;
  readonly order?: SortOrder;
}
