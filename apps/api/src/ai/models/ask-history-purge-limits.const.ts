/** One run of the Ask history purge cron: conversations per batch and the time budget. */
export const ASK_HISTORY_PURGE_LIMITS = {
  BatchSize: 500,
  BudgetMs: 20_000,
} as const;
