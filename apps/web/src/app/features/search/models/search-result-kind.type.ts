import type { SEARCH_RESULT_KIND } from './search-result-kind.const';

export type SearchResultKind = (typeof SEARCH_RESULT_KIND)[keyof typeof SEARCH_RESULT_KIND];
