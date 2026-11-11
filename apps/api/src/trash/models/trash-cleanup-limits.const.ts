/** One purge run deletes `BatchSize` rows at a time and stops starting batches after `BudgetMs`. */
export const TRASH_CLEANUP_LIMITS = {
  BatchSize: 500,
  BudgetMs: 5000,
} as const;
