/**
 * "Process existing links" (ADR 0048 point 6): chunks of `ChunkSize` links, one provider batch each,
 * page excerpts read `ExcerptConcurrency` at a time and only while `ExcerptMarginMs` of the budget is
 * left (a later link then goes on URL and title). A start kicks off a run for `StartBudgetMs`.
 */
export const AI_BACKFILL_LIMIT = {
  ChunkSize: 40,
  ExcerptConcurrency: 8,
  ExcerptMarginMs: 4_500,
  StartBudgetMs: 20_000,
} as const;
