/**
 * Limits of the link job runner (ADR 0048). A claim holds a 60 s lease; a provider outage retries
 * after 30 s and then 2 min (a third retry would wait 10 min), at most 3 attempts. The prompt carries
 * at most `PromptTagsMax` tags and `PromptFoldersMax` folders of the user. A deferred run (one
 * invocation, `maxDuration` 30 s) starts jobs for `DeferredBudgetMs`, `Concurrency` at a time; what
 * is left waits for the tick or the sweep.
 */
export const AI_RUNNER_LIMIT = {
  LeaseSeconds: 60,
  MaxAttempts: 3,
  RetryDelaysMs: [30_000, 120_000, 600_000],
  PromptTagsMax: 200,
  PromptFoldersMax: 100,
  Concurrency: 4,
  DeferredBudgetMs: 20_000,
} as const;
