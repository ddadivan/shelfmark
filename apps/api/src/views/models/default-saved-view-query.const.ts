import {
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type SavedViewQuery,
} from '@shelfmark/contracts';

/** A view that lists everything, newest first: the defaults of every absent field. */
export const DEFAULT_SAVED_VIEW_QUERY: Readonly<SavedViewQuery> = {
  scope: SAVED_VIEW_SCOPE.All,
  folderId: null,
  tags: [],
  kind: null,
  sort: LINK_SORT_FIELD.CreatedAt,
  order: SORT_ORDER.Desc,
  q: '',
};
