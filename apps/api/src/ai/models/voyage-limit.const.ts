/**
 * The Voyage embeddings call (ADR 0051 point 1): plain HTTPS to a pinned URL (no base-URL variable,
 * never derived from input), redirects refused, a timeout per input type, the response size-capped.
 */
export const VOYAGE_LIMIT = {
  Url: 'https://api.voyageai.com/v1/embeddings',
  Host: 'api.voyageai.com',
  Model: 'voyage-4-lite',
  DocumentTimeoutMs: 8000,
  QueryTimeoutMs: 1500,
  MaxResponseBytes: 4 * 1024 * 1024,
  /** Starting guess, to be tuned on a real library after release (plan section 9). */
  MinSimilarity: 0.35,
} as const;
