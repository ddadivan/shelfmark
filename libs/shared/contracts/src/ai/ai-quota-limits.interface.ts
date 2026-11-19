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
  /** Ask your shelf questions per UTC day (AI-4). */
  questionsPerDay: number;
  /** Ask your shelf questions per UTC calendar month (AI-4, fair-use cap). */
  questionsPerMonth: number;
  /** Ask questions answered by the deeper model per UTC day, inside the question limits (ADR 0055). */
  deepQuestionsPerDay: number;
  /** Ask questions answered by the deeper model per UTC calendar month (ADR 0055). */
  deepQuestionsPerMonth: number;
  /** Library clean-up runs with AI checks per UTC calendar month (AI-5); rule checks are unlimited. */
  cleanupAiRunsPerMonth: number;
}
