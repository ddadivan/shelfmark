/** How a deletion attempt ended, as the dialog needs to tell it to the user. */
export const ACCOUNT_DELETION_OUTCOME = {
  Deleted: 'deleted',
  /** 400: the typed email is not the account email. */
  Mismatch: 'mismatch',
  /** 429. */
  RateLimited: 'rate-limited',
  /** 401: the session is gone already; the global handler sends the user to sign-in. */
  SessionGone: 'session-gone',
  /** 5xx or no connection. */
  Failed: 'failed',
} as const;
