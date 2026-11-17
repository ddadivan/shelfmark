/** Limits of the Anthropic provider (ADR 0048: the model call gets 15 s, one attempt per invocation). */
export const ANTHROPIC_LIMIT = {
  /** SDK timeout of one model call. */
  TimeoutMs: 15_000,
  /** The answer is a small JSON object. */
  MaxTokens: 500,
  /** Our queue retries; the SDK does not. */
  MaxRetries: 0,
  /** HTTP statuses (besides 5xx) that are worth another attempt. */
  RetryableStatuses: [408, 409, 429],
} as const;
