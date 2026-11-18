/**
 * Limits of the link job runner (ADR 0049). A claim holds a 60 s lease, which must outlast the page
 * read (`EXCERPT_FETCH_LIMITS.totalTimeoutMs`), the model call (`ANTHROPIC_LIMIT.TimeoutMs`) and
 * `LeaseMarginMs` for the database work around them (`runner/ai-runner-limit.spec.ts` checks it), so a live
 * run never loses its job to a second claim; a provider outage retries
 * after 30 s and then 2 min (a third retry would wait 10 min), at most 3 attempts. The prompt carries
 * at most `PromptTagsMax` tags and `PromptFoldersMax` folders of the user, and up to
 * `PromptExamplesMax` earlier choices for the same site, found among the newest
 * `PromptExamplesScanMax` links per site that contain its name. A deferred run (one
 * invocation, `maxDuration` 30 s) starts jobs for `DeferredBudgetMs`, `Concurrency` at a time; what
 * is left waits for the tick or the sweep.
 */
export const AI_RUNNER_LIMIT = {
  LeaseSeconds: 60,
  LeaseMarginMs: 20_000,
  MaxAttempts: 3,
  RetryDelaysMs: [30_000, 120_000, 600_000],
  PromptTagsMax: 200,
  PromptFoldersMax: 100,
  PromptExamplesMax: 3,
  PromptExamplesScanMax: 20,
  Concurrency: 4,
  DeferredBudgetMs: 20_000,
} as const;
