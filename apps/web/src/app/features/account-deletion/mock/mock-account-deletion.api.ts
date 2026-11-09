import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { DeleteAccountRequest } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_RATING_STORAGE_KEY } from '../../rating/mock/models/mock-rating-storage-key.const';
import type { AccountDeletionApi } from '../models/account-deletion-api.interface';
import { MOCK_ACCOUNT_DELETION_SCENARIO } from './models/mock-account-deletion-scenario.const';
import { MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY } from './models/mock-account-deletion-scenario-storage-key.const';

function failure(status: number): Promise<never> {
  return Promise.reject(new HttpErrorResponse({ status }));
}

function emailOf(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    const user: unknown = JSON.parse(raw);
    if (typeof user === 'object' && user !== null && 'email' in user) {
      return typeof user.email === 'string' ? user.email : null;
    }
  } catch {
    // An unreadable session counts as no session.
  }
  return null;
}

/**
 * In-browser stand-in for `DELETE /api/me`: answers like the API (400 for another email, 401
 * without a session) and ends the stored `sm-mock-session`. `sm-mock-account-deletion` makes it
 * answer 429 or 500 instead, for e2e.
 */
@Service()
export class MockAccountDeletionApi implements AccountDeletionApi {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  delete(request: DeleteAccountRequest): Promise<void> {
    const email = emailOf(this.storage?.getItem(MOCK_SESSION_STORAGE_KEY));
    if (email === null) {
      return failure(HttpStatusCode.Unauthorized);
    }
    if (request.email.toLowerCase() !== email.toLowerCase()) {
      return failure(HttpStatusCode.BadRequest);
    }
    const scenario = this.storage?.getItem(MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY);
    if (scenario === MOCK_ACCOUNT_DELETION_SCENARIO.RateLimited) {
      return failure(HttpStatusCode.TooManyRequests);
    }
    if (scenario === MOCK_ACCOUNT_DELETION_SCENARIO.ServerError) {
      return failure(HttpStatusCode.InternalServerError);
    }
    this.storage?.removeItem(MOCK_SESSION_STORAGE_KEY);
    // The user's other mock data goes with the account.
    this.storage?.removeItem(MOCK_RATING_STORAGE_KEY);
    return Promise.resolve();
  }
}
