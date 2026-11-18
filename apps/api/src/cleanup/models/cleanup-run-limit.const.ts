/**
 * The clean-up run (ADR 0053 point 3): a `running` report with no progress for `StallHours` becomes
 * `failed` (what it found is kept) and no longer blocks a new run. The deferred pass works for
 * `BudgetMs` per start, holds a `LeaseMs` lease on the report row and scans `ChunkSize` links per
 * step by keyset cursor.
 */
export const CLEANUP_RUN_LIMIT = {
  StallHours: 24,
  BudgetMs: 20_000,
  LeaseMs: 60_000,
  ChunkSize: 200,
  /** Users whose running report the daily sweep continues, at most. */
  SweepReportsMax: 50,
} as const;
