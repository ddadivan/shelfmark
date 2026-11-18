/**
 * Why an Ask question ended that the stream itself never says (web only): the request was refused
 * with 429 before the answer started. Not counted; "Try again" is offered.
 */
export const ASK_CLIENT_REASON = {
  RateLimited: 'rate-limited',
} as const;
