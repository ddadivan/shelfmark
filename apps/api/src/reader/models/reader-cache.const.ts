/**
 * How long a stored Reader result lasts. An extracted article or a page without one is kept until
 * the link's URL changes; a failed fetch (timeout, blocked, an error status) is asked again after
 * `FailedRetryMs`.
 */
export const READER_CACHE = {
  FailedRetryMs: 60 * 60 * 1000,
} as const;
