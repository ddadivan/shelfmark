import type { SAVED_VIEWS_LAYOUT } from './saved-views-layout.const';

/** One of `SAVED_VIEWS_LAYOUT`. */
export type SavedViewsLayout = (typeof SAVED_VIEWS_LAYOUT)[keyof typeof SAVED_VIEWS_LAYOUT];
