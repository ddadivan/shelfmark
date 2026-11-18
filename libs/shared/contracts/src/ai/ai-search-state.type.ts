import type { AI_SEARCH_STATE } from './ai-search-state.const';

/** One of `AI_SEARCH_STATE`. */
export type AiSearchState = (typeof AI_SEARCH_STATE)[keyof typeof AI_SEARCH_STATE];
