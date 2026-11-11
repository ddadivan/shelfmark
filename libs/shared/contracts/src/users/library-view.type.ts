import type { LIBRARY_VIEW } from './library-view.const';

/** One of `LIBRARY_VIEW`. */
export type LibraryView = (typeof LIBRARY_VIEW)[keyof typeof LIBRARY_VIEW];
