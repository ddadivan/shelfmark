/** One account purge run: accounts per transaction and the time budget (below the function limit). */
export const ACCOUNT_PURGE_LIMITS = {
  BatchSize: 25,
  BudgetMs: 10_000,
} as const;
