export const DATABASE_ENV = {
  /** Pooled URL used at runtime. */
  Url: 'DATABASE_URL',
  /**
   * Optional size of the API's connection pool (`DATABASE_POOL_LIMIT.Default` when unset). The local
   * PGlite database sets 1 (`scripts/local-db.mjs`): PGlite has one real connection, and parallel
   * requests over its multiplexer fail at random.
   */
  PoolMax: 'DATABASE_POOL_MAX',
} as const;
