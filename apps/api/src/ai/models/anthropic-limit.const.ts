/** Limits of the Anthropic provider (ADR 0048: the model call gets 15 s, one attempt per invocation). */
export const ANTHROPIC_LIMIT = {
  /** Pinned API host: the SDK would otherwise follow an `ANTHROPIC_BASE_URL` environment variable. */
  BaseUrl: 'https://api.anthropic.com',
  /** SDK timeout of one model call. */
  TimeoutMs: 15_000,
  /** The answer is a small JSON object. */
  MaxTokens: 500,
  /** An Ask answer: a few plain sentences (ADR 0051 point 4). */
  AskMaxTokens: 700,
  /** Our queue retries; the SDK does not. */
  MaxRetries: 0,
  /** HTTP statuses (besides 5xx) that are worth another attempt. */
  RetryableStatuses: [408, 409, 429],
} as const;
