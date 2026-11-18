import type { SUGGESTION_STATE } from './suggestion-state.const';

/** One of `SUGGESTION_STATE`. */
export type SuggestionState = (typeof SUGGESTION_STATE)[keyof typeof SUGGESTION_STATE];
