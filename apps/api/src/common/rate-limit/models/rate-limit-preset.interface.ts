/** One rate limit: at most `limit` requests per client per `ttl` milliseconds. */
export interface RateLimitPreset {
  limit: number;
  /** Window length in milliseconds (`@nestjs/throttler` v6 unit). */
  ttl: number;
}
