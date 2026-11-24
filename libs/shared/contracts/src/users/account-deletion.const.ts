/**
 * Account deletion with a grace period (Shelf 05-settings): `DELETE /api/me` schedules the
 * deletion `GraceDays` ahead and signs every device out; signing in again before then shows
 * "Keep my account" (`DELETE` on `StatusEndpoint`). The purge cron deletes the account for good
 * afterwards, the same way the immediate delete did.
 */
export const ACCOUNT_DELETION = {
  GraceDays: 7,
  Endpoint: '/api/me',
  StatusEndpoint: '/api/me/deletion',
} as const;
