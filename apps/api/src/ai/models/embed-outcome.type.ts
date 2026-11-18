/**
 * The answer of `EmbeddingProvider.embed`: one vector per input text, in order, plus the tokens the
 * provider counted; or a failure that may (429, 5xx, timeout, network) or may not be retried.
 */
export type EmbedOutcome =
  { ok: true; vectors: number[][]; tokens: number } | { ok: false; retryable: boolean };
