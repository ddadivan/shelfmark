import type { SUGGESTION_KIND } from './suggestion-kind.const';

export type SuggestionKind = (typeof SUGGESTION_KIND)[keyof typeof SUGGESTION_KIND];
