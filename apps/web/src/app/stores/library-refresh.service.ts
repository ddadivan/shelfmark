import { inject, Injector, type ProviderToken, Service } from '@angular/core';
import { TAB_SYNC_KIND } from '../core/sync/models/tab-sync-kind.const';
import { TabSyncService } from '../core/sync/tab-sync.service';
import { TidyCountStore } from '../features/ai/services/tidy-count.store';
import { FoldersStore } from './folders.store';
import { LinksStore } from './links.store';
import type { LibraryChange } from './models/library-change.interface';
import { PinsStore } from './pins.store';
import { RemindersStore } from './reminders.store';
import { SavedViewsStore } from './saved-views.store';
import { TagsStore } from './tags.store';
import { TrashStore } from './trash.store';

/**
 * The one place that knows which stores read again after the library changed (a bulk action, an
 * import, a restore, a clean-up, another tab's change): the callers say what they touched
 * (`afterChange`) or use a preset, and this service owns the store list, the tag refresh, the Tidy
 * count and the tab-sync post. Stores are taken from the injector when used, so the stores that
 * call this service (`TrashStore`) never form a cycle with it, and a spec that overrides a store
 * token sees its fake.
 */
@Service()
export class LibraryRefreshService {
  private readonly injector = inject(Injector);

  /** Reads again what `change` touched. Fire and forget: each store keeps what shows meanwhile. */
  afterChange(change: LibraryChange): void {
    const get = <T>(token: ProviderToken<T>): T => this.injector.get(token);
    if (change.links) {
      get(LinksStore).refresh();
    }
    if (change.folders) {
      void get(FoldersStore).refresh();
    }
    if (change.tags) {
      // A link may have brought new names, and the counts moved: the list answers both.
      void get(TagsStore).noteLinkSaved();
    }
    if (change.trash) {
      void get(TrashStore).refresh();
    }
    if (change.reminders) {
      void get(RemindersStore).refresh();
    }
    if (change.views) {
      void get(SavedViewsStore).refresh();
    }
    if (change.pins) {
      void get(PinsStore).refresh();
    }
    if (change.tidy) {
      void get(TidyCountStore).load();
    }
    if (change.broadcast) {
      get(TabSyncService).post({ kind: TAB_SYNC_KIND.LibraryChanged });
    }
  }

  /** Folder, tag and saved-view counts: links were saved, moved, tagged or deleted. */
  afterCounts(): void {
    this.afterChange({ folders: true, tags: true, views: true });
  }

  /** A link was deleted for good (its Undo window ended): counts, Trash and the reminder badge. */
  afterDelete(): void {
    this.afterChange({ folders: true, tags: true, trash: true, reminders: true });
  }

  /** Links came back from Trash: the feed, the counts and the reminders they carry. */
  afterRestore(): void {
    this.afterChange({ links: true, folders: true, tags: true, views: true, reminders: true });
  }

  /** Something other than a single link changed all over (import, Undo of an import, clean-up). */
  afterLibraryRewrite(options: { readonly links?: boolean } = {}): void {
    this.afterChange({
      links: options.links ?? true,
      folders: true,
      tags: true,
      trash: true,
      reminders: true,
      views: true,
      pins: true,
      broadcast: true,
    });
  }

  /** What another tab posted: everything the sidebar shows, and the feed for a coarse change. */
  afterOtherTab(feed: boolean): void {
    this.afterChange({
      links: feed,
      folders: true,
      tags: true,
      trash: true,
      reminders: true,
      views: true,
      pins: true,
    });
  }
}
