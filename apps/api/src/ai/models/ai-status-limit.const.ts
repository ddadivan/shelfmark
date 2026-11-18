/**
 * Timing of the status shown in Settings › AI: `providerStatus` is `unavailable` while the user's
 * latest finished job failed with `unavailable` within `UnavailableWindowMs`. `BackfillLinksPerMinute`
 * is the rough pace used for the backfill estimate (one chunk of 40 per tick every 15 s, with margin).
 */
export const AI_STATUS_LIMIT = {
  UnavailableWindowMs: 15 * 60_000,
  BackfillLinksPerMinute: 80,
} as const;
