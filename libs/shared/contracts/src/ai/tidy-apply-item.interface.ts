/** One link of a Tidy run with the suggestion ids the user left selected. */
export interface TidyApplyItem {
  linkId: string;
  /** 1 to `TIDY_LIMIT.SuggestionIdsPerLinkMax` distinct ids; ids that are not this link's open suggestions are ignored. */
  suggestionIds: string[];
}
