import type { LinkKind } from '../links/link-kind.type';
import type { LinkSortField } from '../links/link-sort-field.type';
import type { SortOrder } from '../pagination/sort-order.type';
import type { SavedViewScope } from './saved-view-scope.type';

/** The stored filter of a saved view, always complete and normalized in responses. */
export interface SavedViewQuery {
  scope: SavedViewScope;
  /** Set exactly when `scope` is `folder`. */
  folderId: string | null;
  /** Normalized tag names (AND), at most `SAVED_VIEW_LIMIT.TagsMax`; `[]` = no tag filter. */
  tags: string[];
  /** `null` = every kind. */
  kind: LinkKind | null;
  sort: LinkSortField;
  order: SortOrder;
  /** Search text, `''` = no search. */
  q: string;
}
