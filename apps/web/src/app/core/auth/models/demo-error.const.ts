/** Why the demo could not start, when the API said so (429 / 503). Anything else is a plain failure. */
export const DEMO_ERROR = {
  RateLimited: 'rate-limited',
  Unavailable: 'unavailable',
} as const;
