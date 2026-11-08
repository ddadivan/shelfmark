/** How a tag mutation ended. */
export const TAG_OUTCOME = {
  Done: 'done',
  /** The name is taken by another tag (409). */
  Conflict: 'conflict',
  /** The per-user tag limit is reached (409 with the limit message). */
  LimitReached: 'limit-reached',
  Failed: 'failed',
} as const;
