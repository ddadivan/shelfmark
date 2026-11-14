import { DOCUMENT } from '@angular/common';
import { inject, Injector, Service } from '@angular/core';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { PinsStore } from '../../stores/pins.store';
import { AuthStore } from '../auth/auth.store';
import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import type { TabSyncMessage } from './models/tab-sync-message.type';
import { SignedOutLockService } from './signed-out-lock.service';

/**
 * Applies what another tab posted (`TabSyncService`, #268). It is loaded on the first message
 * only: it holds the library stores and the signed-out dialog, which the first screen does not
 * need (#339).
 */
@Service()
export class TabSyncReceiver {
  private readonly injector = inject(Injector);
  private readonly doc = inject(DOCUMENT);

  receive(data: TabSyncMessage): void {
    const auth = this.injector.get(AuthStore);
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
    void this.injector.get(PinsStore).refresh();
    if (feed) {
      this.links().refresh();
    }
  }

  private links() {
    return this.injector.get(LinksStore);
  }
}
