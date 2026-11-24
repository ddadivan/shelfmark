/**
 * `GET` / `DELETE /api/me/deletion` (Shelf 05-settings "deletion scheduled"): when the account
 * will be deleted for good, or `null` while no deletion is scheduled.
 */
export interface AccountDeletionStatus {
  /** ISO time the purge may run from (`ACCOUNT_DELETION.GraceDays` after the request). */
  deletionScheduledAt: string | null;
}
