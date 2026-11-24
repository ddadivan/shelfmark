import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  ACCOUNT_DELETION,
  type AccountDeletionStatus,
  type DeleteAccountRequest,
} from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import type { AccountDeletionApi } from '../models/account-deletion-api.interface';
import { MOCK_ACCOUNT_DELETION_SCENARIO } from './models/mock-account-deletion-scenario.const';
import { MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY } from './models/mock-account-deletion-scenario-storage-key.const';
import { MOCK_ACCOUNT_DELETION_SCHEDULED_STORAGE_KEY } from './models/mock-account-deletion-scheduled-storage-key.const';

const DAY_MS = 24 * 60 * 60 * 1000;

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
 * MOCK: in-browser stand-in for `DELETE /api/me` and `/api/me/deletion`: answers like the API (400
 * for another email, 401 without a session), schedules the deletion `ACCOUNT_DELETION.GraceDays`
 * ahead in `sm-mock-account-deletion-scheduled` (a repeat keeps the date) and ends the stored
 * `sm-mock-session`; the data stays (nothing purges in the mock). `sm-mock-account-deletion`
 * makes the delete answer 429 or 500 instead, for e2e.
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
    if (!this.storage?.getItem(MOCK_ACCOUNT_DELETION_SCHEDULED_STORAGE_KEY)) {
      const due = new Date(Date.now() + ACCOUNT_DELETION.GraceDays * DAY_MS).toISOString();
      this.storage?.setItem(MOCK_ACCOUNT_DELETION_SCHEDULED_STORAGE_KEY, due);
    }
    this.storage?.removeItem(MOCK_SESSION_STORAGE_KEY);
    return Promise.resolve();
  }

  status(): Promise<AccountDeletionStatus> {
    if (emailOf(this.storage?.getItem(MOCK_SESSION_STORAGE_KEY)) === null) {
      return failure(HttpStatusCode.Unauthorized);
    }
    const stored = this.storage?.getItem(MOCK_ACCOUNT_DELETION_SCHEDULED_STORAGE_KEY) ?? null;
    const valid = stored !== null && !Number.isNaN(Date.parse(stored));
    return Promise.resolve({ deletionScheduledAt: valid ? stored : null });
  }

  cancel(): Promise<AccountDeletionStatus> {
    if (emailOf(this.storage?.getItem(MOCK_SESSION_STORAGE_KEY)) === null) {
      return failure(HttpStatusCode.Unauthorized);
    }
    this.storage?.removeItem(MOCK_ACCOUNT_DELETION_SCHEDULED_STORAGE_KEY);
    return Promise.resolve({ deletionScheduledAt: null });
  }
}
