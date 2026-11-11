import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injector, Service } from '@angular/core';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { AuthStore } from '../auth/auth.store';
import { isTabSyncMessage } from './is-tab-sync-message';
import { TAB_SYNC_CHANNEL } from './models/tab-sync-channel.const';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import type { TabSyncEvent } from './models/tab-sync-event.type';
import type { TabSyncMessage } from './models/tab-sync-message.type';
import { SignedOutLockService } from './signed-out-lock.service';

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
  private readonly doc = inject(DOCUMENT);
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
    if (!isTabSyncMessage(data)) {
      return;
    }
    const auth = this.auth();
    const user = auth.user();
    if (data.kind === TAB_SYNC_KIND.SignedIn) {
      // This tab is locked or on the sign-in page, or shows another account: start again with
      // the session the browser now has.
      if (auth.loaded() && user?.id !== data.userId) {
        this.doc.defaultView?.location.reload();
      }
      return;
    }
    if (!user || user.id !== data.userId) {
      return;
    }
    switch (data.kind) {
      case TAB_SYNC_KIND.SignedOut:
        auth.expireSession();
        void this.injector.get(SignedOutLockService).lock();
        return;
      case TAB_SYNC_KIND.LinkSaved:
        this.links().addSaved(data.link);
        this.refreshLibrary(false);
        return;
      case TAB_SYNC_KIND.LinkChanged:
        this.links().applyEdit(data.link);
        this.refreshLibrary(false);
        return;
      case TAB_SYNC_KIND.LinkRemoved:
        this.links().applyRemoval(data.id);
        this.refreshLibrary(false);
        return;
      case TAB_SYNC_KIND.LibraryChanged:
        this.refreshLibrary(true);
        return;
    }
  }

  /** Reloads the sidebar counts and tags, and (for folder or tag changes) the open feed. */
  private refreshLibrary(feed: boolean): void {
    void this.injector.get(FoldersStore).refresh();
    void this.injector.get(TagsStore).refresh();
    // A delete, restore or empty elsewhere changes what Trash lists (a no-op until it was opened).
    void this.injector.get(TrashStore).refresh();
    if (feed) {
      this.links().refresh();
    }
  }

  private auth() {
    return this.injector.get(AuthStore);
  }

  private links() {
    return this.injector.get(LinksStore);
  }
}
