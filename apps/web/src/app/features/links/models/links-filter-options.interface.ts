import type { LinkKind, LinkSortField, SavedWithin, SortOrder } from '@shelfmark/contracts';

/** The query parameters of the library page, common to every scope. */
export interface LinksFilterOptions {
  /** Tag names; a link must have all of them. */
  readonly tags?: readonly string[];
  /** Title search. */
  readonly q?: string;
  /** Only links of this kind (`?kind=video`). */
  readonly kind?: LinkKind;
  /** Only links saved in the last week or month (`?saved=week`). */
  readonly saved?: SavedWithin;
  /** Only favorites, on a feed that is not Favorites itself (`?fav=1`). */
  readonly favorite?: true;
  readonly sort?: LinkSortField;
  readonly order?: SortOrder;
}
