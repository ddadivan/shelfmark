import type { SUGGESTION_KIND } from './suggestion-kind.const';

/** One of `SUGGESTION_KIND`. */
export type SuggestionKind = (typeof SUGGESTION_KIND)[keyof typeof SUGGESTION_KIND];
