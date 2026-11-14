/** Overrides of the purge limits, for tests. */
export interface TrashCleanupOptions {
  batchSize?: number;
  budgetMs?: number;
  /** The moment retention is measured against; defaults to the start of the run. */
  now?: Date;
}
