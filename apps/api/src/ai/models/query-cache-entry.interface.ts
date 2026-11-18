/** One cached query vector (a validated pgvector literal) and when it expires. */
export interface QueryCacheEntry {
  vector: string;
  expiresAt: number;
}
