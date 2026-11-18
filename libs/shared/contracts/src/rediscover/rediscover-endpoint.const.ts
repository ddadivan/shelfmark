/** Rediscover routes (F8). */
export const REDISCOVER_ENDPOINT = {
  /** `GET` this week's block. */
  Block: '/api/rediscover',
  /** `POST` hides the block until next week (204). */
  Dismiss: '/api/rediscover/dismiss',
  /** `POST` "Not interested": the link never shows in the block again (204, idempotent). */
  Hide: '/api/rediscover/links/:id/hide',
} as const;
