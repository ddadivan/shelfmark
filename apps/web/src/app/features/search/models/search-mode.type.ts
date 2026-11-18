import type { SEARCH_MODE } from './search-mode.const';

/** One of `SEARCH_MODE`. */
export type SearchMode = (typeof SEARCH_MODE)[keyof typeof SEARCH_MODE];
