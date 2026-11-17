export interface DatabaseConfig {
  /** Pooled connection string used by the running API. Never log or echo it. */
  connectionString: string;
  /** Size of the API's connection pool (`DATABASE_POOL_MAX`, else `DATABASE_POOL_LIMIT.Default`). */
  poolMax: number;
}
