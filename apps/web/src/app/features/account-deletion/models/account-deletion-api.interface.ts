import type { DeleteAccountRequest } from '@shelfmark/contracts';

/**
 * What the web app needs from `DELETE /api/me`. `HttpAccountDeletionApi` talks to the API; the
 * mock (development and e2e builds) ends the stored mock session.
 */
export interface AccountDeletionApi {
  /**
   * Deletes the signed-in account and all its data. Rejects with an `HttpErrorResponse`: 400 when
   * the email does not match, 401 without a session, 429 when rate limited, 5xx on a failure.
   */
  delete(request: DeleteAccountRequest): Promise<void>;
}
