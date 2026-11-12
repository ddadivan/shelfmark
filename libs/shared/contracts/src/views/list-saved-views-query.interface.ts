import type { SavedViewScope } from './saved-view-scope.type';

/**
 * Optional query of `GET /api/views`: the feed the chips sit on (#335). With it `total` is the
 * number of live links of that feed and every view counts the links of the feed it matches (the
 * feed and the view are intersected). Without it the counts are those of the whole library.
 */
export interface ListSavedViewsQuery {
  /** The feed's scope; `folder` needs `folderId`, any other scope rejects it (400). */
  scope?: SavedViewScope;
  folderId?: string;
  /** Tag names the feed is narrowed by (AND); at most `SAVED_VIEW_LIMIT.TagsMax`. */
  tag?: string[];
}
