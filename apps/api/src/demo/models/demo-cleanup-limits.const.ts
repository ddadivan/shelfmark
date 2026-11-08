/** One cleanup run deletes `BatchSize` users at a time and stops starting batches after `BudgetMs`. */
export const DEMO_CLEANUP_LIMITS = {
  BatchSize: 100,
  BudgetMs: 5000,
} as const;
