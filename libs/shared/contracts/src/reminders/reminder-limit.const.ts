/**
 * Limits of reminders (#275). `ListMax` caps each group of `GET /api/reminders` (due and upcoming),
 * `MaxAheadDays` how far ahead a reminder may be set, `PastToleranceMs` the clock skew allowed
 * between the browser and the server for a time that is "now" (a preset picked a moment ago).
 */
export const REMINDER_LIMIT = {
  ListMax: 200,
  MaxAheadDays: 1830,
  PastToleranceMs: 60_000,
} as const;
