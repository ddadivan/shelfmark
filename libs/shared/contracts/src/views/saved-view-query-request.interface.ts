import type { LinkKind } from '../links/link-kind.type';
import type { LinkSortField } from '../links/link-sort-field.type';
import type { SortOrder } from '../pagination/sort-order.type';
import type { SavedViewScope } from './saved-view-scope.type';

/**
 * The filter sent to create or change a view; the server validates it strictly (unknown fields are a 400)
 * and stores the normalized `SavedViewQuery`. Absent fields take the defaults: no tags, every kind,
 * newest first, no search.
 */
export interface SavedViewQueryRequest {
  scope: SavedViewScope;
  /** Required with `scope: 'folder'` (one of the user's live folders, else 404), a 400 with any other scope. */
  folderId?: string | null;
  /** At most `SAVED_VIEW_LIMIT.TagsMax` names of at most `TAG_LIMIT.NameMax` characters; normalized and deduplicated. */
  tags?: string[];
  kind?: LinkKind | null;
  sort?: LinkSortField;
  order?: SortOrder;
  /** At most `LINK_LIMIT.QueryMax` characters, trimmed. */
  q?: string;
}
