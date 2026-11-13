import { DestroyRef, inject, Injector, Service } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { isTabSyncMessage } from './is-tab-sync-message';
import { TAB_SYNC_CHANNEL } from './models/tab-sync-channel.const';
import type { TabSyncEvent } from './models/tab-sync-event.type';
import type { TabSyncMessage } from './models/tab-sync-message.type';

/**
 * Keeps the tabs of one browser in step (#268, SyncDemo.dc.html) over a `BroadcastChannel`. The
 * API seams post what changed after a successful request; the other tabs apply it silently: a
 * saved link lands in the feed with its usual animation, edits, moves and deletes simply show,
 * folder and tag changes reload the sidebar and the open feed. Signing out locks the other tabs;
 * signing in again (anywhere) reloads them. The theme follows through the `storage` event
 * (`ThemeService`). Without `BroadcastChannel` nothing is synced.
 */
@Service()
export class TabSyncService {
  private readonly injector = inject(Injector);
  private channel: BroadcastChannel | null = null;

  /** Opens the channel; idempotent. Called by an app initializer. */
  init(): void {
    if (this.channel || typeof BroadcastChannel === 'undefined') {
      return;
    }
    const channel = new BroadcastChannel(TAB_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => this.receive(event.data);
    this.channel = channel;
    this.injector.get(DestroyRef).onDestroy(() => {
      channel.close();
      this.channel = null;
    });
  }

  /**
   * Tells the other tabs about a change made in this one, as the signed-in user (or as `userId`,
   * for a sign-out that has already cleared the user). Nothing is posted for a guest.
   */
  post(event: TabSyncEvent, userId = this.auth().user()?.id): void {
    if (this.channel && userId) {
      const message: TabSyncMessage = { ...event, userId };
      this.channel.postMessage(message);
    }
  }

  private receive(data: unknown): void {
    if (isTabSyncMessage(data)) {
      // The receiver (library stores, signed-out dialog) is a lazy chunk: not part of the first load.
      void import('./tab-sync-receiver.service').then(({ TabSyncReceiver }) =>
        this.injector.get(TabSyncReceiver).receive(data),
      );
    }
  }

  private auth() {
    return this.injector.get(AuthStore);
  }
}
