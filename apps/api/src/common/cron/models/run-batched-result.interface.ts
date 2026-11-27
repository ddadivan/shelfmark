/** What a batched cron run did. */
export interface RunBatchedResult {
  processed: number;
  /** Work is left for the next run (the budget ended this one and `anyLeft` said yes). */
  hasMore: boolean;
  /** The budget, not an empty or short batch, ended the run (a next phase must not start). */
  budgetEnded: boolean;
}
