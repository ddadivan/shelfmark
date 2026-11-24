import { inject, Service, signal } from '@angular/core';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { ACCOUNT_DELETION_API } from '../models/account-deletion-api.const';

/**
 * Whether the signed-in account is scheduled for deletion (Shelf 05-settings "deletion
 * scheduled"): loaded by the Account page, `keep()` is "Keep my account". Forgotten when the
 * session ends.
 */
@Service()
export class AccountDeletionStatusStore {
  private readonly api = inject(ACCOUNT_DELETION_API);

  /** ISO time the account will be deleted, or `null`. */
  readonly scheduledAt = signal<string | null>(null);
  readonly loaded = signal(false);
  /** "Keep my account" is on its way. */
  readonly keeping = signal(false);

  constructor() {
    inject(SessionScope).onEnd(() => {
      this.scheduledAt.set(null);
      this.loaded.set(false);
    });
  }

  /** Reads the status; a failure leaves it unscheduled (the page then shows the normal sections). */
  async load(): Promise<void> {
    try {
      this.scheduledAt.set((await this.api.status()).deletionScheduledAt);
    } catch {
      this.scheduledAt.set(null);
    } finally {
      this.loaded.set(true);
    }
  }

  /** Cancels the scheduled deletion; false when the request failed (nothing changed). */
  async keep(): Promise<boolean> {
    if (this.keeping()) {
      return false;
    }
    this.keeping.set(true);
    try {
      this.scheduledAt.set((await this.api.cancel()).deletionScheduledAt);
      return true;
    } catch {
      return false;
    } finally {
      this.keeping.set(false);
    }
  }
}
