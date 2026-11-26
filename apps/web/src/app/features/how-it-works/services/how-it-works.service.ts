import { computed, inject, Service, signal } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { HowItWorksDialogComponent } from '../components/how-it-works-dialog/how-it-works-dialog.component';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { HOW_IT_WORKS_CARD_DAYS } from '../models/how-it-works-card.const';
import type { HowItWorksState } from '../models/how-it-works-state.interface';

const MS_PER_DAY = 86_400_000;

function isState(value: unknown): value is HowItWorksState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['firstSeen'] === 'string' &&
    typeof (value as Record<string, unknown>)['done'] === 'boolean'
  );
}

/**
 * "How it works" (#270, HowItWorks.dc.html): opens the promo video dialog and decides whether the
 * sidebar card shows: during the first two weeks the account is seen on this device, until the
 * video was opened or the card hidden. A demo visitor always sees it until then (no two-week
 * window): the demo is where people meet Shelfmark first. The state is per user in `localStorage` (the account's
 * creation time is not part of the session), so another device shows the card again.
 */
@Service()
export class HowItWorksService {
  private readonly auth = inject(AuthStore);
  private readonly dialogs = inject(DialogService);
  private readonly storage = inject(SafeStorage);
  /** Bumped on writes, so `cardVisible` re-reads storage. */
  private readonly version = signal(0);

  readonly cardVisible = computed(() => {
    this.version();
    const user = this.auth.user();
    if (!user) {
      return false;
    }
    const state = this.read(user.id);
    if (state.done) {
      return false;
    }
    return (
      user.isDemo || Date.now() - Date.parse(state.firstSeen) < HOW_IT_WORKS_CARD_DAYS * MS_PER_DAY
    );
  });

  /** Opens the video; the card is done from now on. */
  async open(): Promise<void> {
    this.markDone();
    await this.dialogs.open(HowItWorksDialogComponent, { size: DIALOG_SIZE.Lg }).result;
  }

  /** "Hide" on the card. */
  hideCard(): void {
    this.markDone();
  }

  private markDone(): void {
    const user = this.auth.user();
    if (user) {
      this.save(user.id, { ...this.read(user.id), done: true });
    }
  }

  /** The stored state, created (first seen now) when there is none. */
  private read(userId: string): HowItWorksState {
    // Unreadable or blocked storage: treat as first seen now.
    const stored = this.storage.getJson(STORAGE_KEY.HowItWorksPrefix + userId, isState, null);
    if (stored !== null) {
      return stored;
    }
    const fresh: HowItWorksState = { firstSeen: new Date().toISOString(), done: false };
    this.save(userId, fresh, false);
    return fresh;
  }

  private save(userId: string, state: HowItWorksState, notify = true): void {
    // Blocked storage: the card simply shows again next time.
    this.storage.setJson(STORAGE_KEY.HowItWorksPrefix + userId, state);
    if (notify) {
      this.version.update((value) => value + 1);
    }
  }
}
