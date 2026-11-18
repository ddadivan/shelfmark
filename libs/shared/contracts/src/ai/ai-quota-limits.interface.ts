/** Limits of one AI tier (counts only, never content). */
export interface AiQuotaLimits {
  /** New links processed per UTC calendar month (save, draft and rewrite jobs). */
  linksPerMonth: number;
  /** One-time allowance for "Process existing links" (backfill), separate from the monthly limit. */
  backfillLinks: number;
  /** Link texts embedded for search by meaning per UTC calendar month (AI-3). */
  embedsPerMonth: number;
  /** Search queries embedded per UTC calendar month (AI-3). */
  searchQueriesPerMonth: number;
}
