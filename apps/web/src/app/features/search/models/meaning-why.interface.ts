/** The "why it matched" line of a meaning result: its key and the reasons, joined. */
export interface MeaningWhy {
  /** `ai.search.why`, or `ai.search.fromSummary` when every reason comes from the summary. */
  readonly key: string;
  readonly reasons: string;
}
