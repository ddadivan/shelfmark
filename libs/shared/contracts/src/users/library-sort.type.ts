import type { LIBRARY_SORT } from './library-sort.const';

/** One of `LIBRARY_SORT`. */
export type LibrarySort = (typeof LIBRARY_SORT)[keyof typeof LIBRARY_SORT];
