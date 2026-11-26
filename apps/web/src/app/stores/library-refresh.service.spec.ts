import { TestBed } from '@angular/core/testing';
import { TAB_SYNC_KIND } from '../core/sync/models/tab-sync-kind.const';
import { TabSyncService } from '../core/sync/tab-sync.service';
import { TidyCountStore } from '../features/ai/services/tidy-count.store';
import { FoldersStore } from './folders.store';
import { LibraryRefreshService } from './library-refresh.service';
import { LinksStore } from './links.store';
import { PinsStore } from './pins.store';
import { RemindersStore } from './reminders.store';
import { SavedViewsStore } from './saved-views.store';
import { TagsStore } from './tags.store';
import { TrashStore } from './trash.store';

function setup() {
  const calls: string[] = [];
  const spy = (name: string) => vi.fn(() => (calls.push(name), Promise.resolve()));
  const post = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: LinksStore, useValue: { refresh: () => calls.push('links') } },
      { provide: FoldersStore, useValue: { refresh: spy('folders') } },
      { provide: TagsStore, useValue: { noteLinkSaved: spy('tags') } },
      { provide: TrashStore, useValue: { refresh: spy('trash') } },
      { provide: RemindersStore, useValue: { refresh: spy('reminders') } },
      { provide: SavedViewsStore, useValue: { refresh: spy('views') } },
      { provide: PinsStore, useValue: { refresh: spy('pins') } },
      { provide: TidyCountStore, useValue: { load: spy('tidy') } },
      { provide: TabSyncService, useValue: { post } },
    ],
  });
  return { service: TestBed.inject(LibraryRefreshService), calls, post };
}

describe('LibraryRefreshService', () => {
  it('reads again only what the change says', () => {
    const { service, calls, post } = setup();
    service.afterChange({ folders: true, tidy: true });
    expect(calls).toEqual(['folders', 'tidy']);
    expect(post).not.toHaveBeenCalled();
  });

  it('does nothing for an empty change', () => {
    const { service, calls, post } = setup();
    service.afterChange({});
    expect(calls).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('tells the other tabs only on request', () => {
    const { service, post } = setup();
    service.afterChange({ broadcast: true });
    expect(post).toHaveBeenCalledExactlyOnceWith({ kind: TAB_SYNC_KIND.LibraryChanged });
  });

  it('afterCounts: folders, tags and saved views', () => {
    const { service, calls } = setup();
    service.afterCounts();
    expect(calls).toEqual(['folders', 'tags', 'views']);
  });

  it('afterDelete: counts, Trash and reminders, not the feed', () => {
    const { service, calls } = setup();
    service.afterDelete();
    expect(calls).toEqual(['folders', 'tags', 'trash', 'reminders']);
  });

  it('afterRestore: the feed, counts, saved views and reminders', () => {
    const { service, calls } = setup();
    service.afterRestore();
    expect(calls).toEqual(['links', 'folders', 'tags', 'reminders', 'views']);
  });

  it('afterLibraryRewrite: every store, the other tabs, the feed unless left out', () => {
    const { service, calls, post } = setup();
    service.afterLibraryRewrite();
    expect(calls).toEqual(['links', 'folders', 'tags', 'trash', 'reminders', 'views', 'pins']);
    expect(post).toHaveBeenCalledOnce();
    calls.length = 0;
    service.afterLibraryRewrite({ links: false });
    expect(calls).not.toContain('links');
    expect(calls).toContain('reminders');
    expect(calls).toContain('views');
  });

  it('afterOtherTab never posts back; the feed only for a coarse change', () => {
    const { service, calls, post } = setup();
    service.afterOtherTab(false);
    expect(calls).toEqual(['folders', 'tags', 'trash', 'reminders', 'views', 'pins']);
    service.afterOtherTab(true);
    expect(calls).toContain('links');
    expect(post).not.toHaveBeenCalled();
  });
});
