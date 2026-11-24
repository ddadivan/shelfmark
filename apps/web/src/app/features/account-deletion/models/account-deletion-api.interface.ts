import type { AccountDeletionStatus, DeleteAccountRequest } from '@shelfmark/contracts';

/**
 * What the web app needs from `DELETE /api/me` and `/api/me/deletion` (deletion with a grace
 * period, `ACCOUNT_DELETION`). `HttpAccountDeletionApi` talks to the API; the mock (development
 * and e2e builds) ends the stored mock session and remembers the date.
 */
export interface AccountDeletionApi {
  /**
   * Schedules the deletion of the signed-in account and ends every session. Rejects with an
   * `HttpErrorResponse`: 400 when the email does not match, 401 without a session, 429 when rate
   * limited, 5xx on a failure.
   */
  delete(request: DeleteAccountRequest): Promise<void>;
  /** When the account will be deleted, or `null`. */
  status(): Promise<AccountDeletionStatus>;
  /** "Keep my account": cancels a scheduled deletion. */
  cancel(): Promise<AccountDeletionStatus>;
}
