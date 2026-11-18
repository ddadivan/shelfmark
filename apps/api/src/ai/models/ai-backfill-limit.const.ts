/**
 * "Process existing links" (ADR 0049 point 6): chunks of `ChunkSize` links, one provider batch each,
 * page excerpts read `ExcerptConcurrency` at a time and only while `ExcerptMarginMs` of the budget is
 * left (a later link then goes on URL and title). A start kicks off a run for `StartBudgetMs`. A
 * claimed chunk holds `ChunkLeaseMs` until its batch is recorded (far longer than any budget that
 * submits it); past it, the chunk's instance is gone and its jobs fail and are refunded.
 */
export const AI_BACKFILL_LIMIT = {
  ChunkSize: 40,
  ExcerptConcurrency: 8,
  ExcerptMarginMs: 4_500,
  StartBudgetMs: 20_000,
  ChunkLeaseMs: 5 * 60_000,
} as const;
