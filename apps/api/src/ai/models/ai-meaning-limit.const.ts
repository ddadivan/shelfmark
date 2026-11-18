/**
 * Meaning search and related links (ADR 0050 point 6): `KnnLimit` nearest vectors of live links are
 * read (more than a page shows, so word matches removed first still leave meaning matches); the read
 * over-fetches by the user's trashed links with a vector, at most `KnnFetchMax` rows in all, so
 * trashed links never shrink the result. Those below the provider's `minSimilarity` or more than
 * `RelativeWindow` below the best are dropped. The per-instance query vector cache holds `CacheSize`
 * entries for `CacheTtlMs` (nothing at rest).
 */
export const AI_MEANING_LIMIT = {
  KnnLimit: 40,
  KnnFetchMax: 200,
  RelativeWindow: 0.15,
  CacheSize: 500,
  CacheTtlMs: 10 * 60_000,
} as const;
