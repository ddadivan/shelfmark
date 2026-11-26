import { computed, inject, Service, signal } from '@angular/core';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { AiSettingsActions } from '../../ai/services/ai-settings-actions.service';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { BACKFILL_REMINDER_CONFIRM_MS } from '../models/backfill-reminder-confirm-ms.const';

const DISMISSED = '1';

/**
 * The search reminder "AI hasn't read N older links yet" (hotfix 2.2.1), shared by the header
 * panel and the search dialog: shown while search by meaning is on (AI too) and the account has
 * links "Process existing links" would take (`backfillOffer`: eligible, within the allowance, no
 * run going or done). Process starts the backfill (the call of Settings › AI), then the row reads
 * "Processing started" for `BACKFILL_REMINDER_CONFIRM_MS` and goes. Hide is remembered on this
 * device (`localStorage`, one of `USER_STORAGE_KEYS`) and forgotten when the session ends.
 */
@Service()
export class BackfillReminderService {
  private readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly storage = inject(SafeStorage);
  private readonly dismissed = signal(this.readDismissed());
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** "Processing started" is on screen. */
  readonly confirming = signal(false);
  readonly starting = signal(false);
  /** The links the reminder names; 0 hides it (unless it is confirming a start). */
  readonly count = computed(() =>
    this.store.meaningSearchOn() && !this.dismissed() ? this.store.backfillOffer() : 0,
  );
  readonly shown = computed(() => this.confirming() || this.count() > 0);

  constructor() {
    inject(SessionScope).onEnd(() => {
      clearTimeout(this.timer);
      this.dismissed.set(false);
      this.confirming.set(false);
      this.starting.set(false);
    });
  }

  /** Starts "Process existing links"; resolves whether it started (a refusal shows a toast). */
  async process(): Promise<boolean> {
    if (this.starting() || this.confirming()) {
      return false;
    }
    this.starting.set(true);
    const started = await this.actions.startBackfill();
    this.starting.set(false);
    if (started) {
      this.confirming.set(true);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.confirming.set(false), BACKFILL_REMINDER_CONFIRM_MS);
    }
    return started;
  }

  /** Hides the reminder for good on this device. */
  dismiss(): void {
    this.dismissed.set(true);
    // Blocked storage: hidden for this visit only.
    this.storage.set(STORAGE_KEY.BackfillReminderDismissed, DISMISSED);
  }

  private readDismissed(): boolean {
    return this.storage.getString(STORAGE_KEY.BackfillReminderDismissed) === DISMISSED;
  }
}
