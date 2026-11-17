/**
 * Meaning search and related links (ADR 0050 point 6): `KnnLimit` nearest vectors are read, those
 * below the provider's `minSimilarity` or more than `RelativeWindow` below the best are dropped. The
 * per-instance query vector cache holds `CacheSize` entries for `CacheTtlMs` (nothing at rest).
 */
export const AI_MEANING_LIMIT = {
  KnnLimit: 20,
  RelativeWindow: 0.15,
  CacheSize: 500,
  CacheTtlMs: 10 * 60_000,
} as const;
