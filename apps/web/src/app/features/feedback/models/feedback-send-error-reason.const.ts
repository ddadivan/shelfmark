/** Why a feedback message could not be sent. */
export const FEEDBACK_SEND_ERROR_REASON = {
  /** 429: too many messages in the last hour. */
  RateLimited: 'rate-limited',
  /** Anything else: the network, the server, a rejected body. */
  Failed: 'failed',
} as const;
