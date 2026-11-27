/** How one cron run walks its work in batches inside a time budget. */
export interface RunBatchedOptions {
  /** Rows one `step` handles at most; a shorter answer means nothing is left. */
  batchSize: number;
  /** After this many milliseconds (checked between batches) the run stops with `hasMore`. */
  budgetMs: number;
  /** Handles one batch and answers how many rows it processed. */
  step: () => Promise<number>;
  /** Asked once when the budget ended a run that still had full batches: is there more work? */
  anyLeft: () => Promise<boolean>;
  /** The clock in milliseconds (default `Date.now`); the run's start is read from it too. */
  now?: () => number;
  /** When the run began, for a run made of several phases that share one budget. */
  startedAt?: number;
}
