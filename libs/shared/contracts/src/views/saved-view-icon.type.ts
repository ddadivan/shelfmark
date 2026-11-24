import type { SAVED_VIEW_ICON } from './saved-view-icon.const';

/** One of `SAVED_VIEW_ICON`. */
export type SavedViewIcon = (typeof SAVED_VIEW_ICON)[keyof typeof SAVED_VIEW_ICON];
