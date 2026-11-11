import type { SAVED_VIEW_SCOPE } from './saved-view-scope.const';

/** One of `SAVED_VIEW_SCOPE`. */
export type SavedViewScope = (typeof SAVED_VIEW_SCOPE)[keyof typeof SAVED_VIEW_SCOPE];
