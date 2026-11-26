import { TestBed } from '@angular/core/testing';
import { IMPORT_SOURCE, type ImportSummary } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { Observable, of, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { TAB_SYNC_KIND } from '../../../core/sync/models/tab-sync-kind.const';
import { TabSyncService } from '../../../core/sync/tab-sync.service';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { ImportAiFollowService } from './import-ai-follow.service';
import { RecentImportsStore } from './recent-imports.store';

function summary(id: string, extra: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id,
    source: IMPORT_SOURCE.Browser,
    fileName: `${id}.html`,
    createdAt: '2026-11-18T10:00:00.000Z',
    finishedAt: '2026-11-18T10:01:00.000Z',
    ai: null,
    targetFolderId: null,
    linksCreated: 5,
    foldersCreated: 1,
    skipped: 0,
    failed: 0,
    ...extra,
  };
}

async function setup(confirmed = true) {
  const api = {
    list: vi.fn<ImportApi['list']>(() => of({ items: [summary('a'), summary('b')] })),
    check: vi.fn(),
    start: vi.fn(),
    addLinks: vi.fn(),
    finish: vi.fn(),
    undo: vi.fn<ImportApi['undo']>(() => of({ links: 5, folders: 1, tags: 0 })),
  };
  const toasts: ToastOptions[] = [];
  const unwatch = vi.fn();
  const confirm = vi.fn(() => Promise.resolve(confirmed));
  const refresh = () => vi.fn(async () => undefined);
  const stores = {
    folders: refresh(),
    tags: refresh(),
    trash: refresh(),
    pins: refresh(),
    reminders: refresh(),
    links: vi.fn(),
    post: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: api },
      { provide: DialogService, useValue: { confirm } },
      { provide: FoldersStore, useValue: { refresh: stores.folders } },
      { provide: TagsStore, useValue: { noteLinkSaved: stores.tags } },
      { provide: TrashStore, useValue: { refresh: stores.trash } },
      { provide: PinsStore, useValue: { refresh: stores.pins } },
      { provide: RemindersStore, useValue: { refresh: stores.reminders } },
      { provide: LinksStore, useValue: { refresh: stores.links } },
      { provide: TabSyncService, useValue: { post: stores.post } },
      { provide: ImportAiFollowService, useValue: { unwatch } },
      {
        provide: ToastService,
        useValue: {
          show: (toast: ToastOptions) => {
            toasts.push(toast);
            return { dismiss: () => undefined, closed: new Promise(() => undefined) };
          },
        },
      },
    ],
  });
  await loadEnglish();
  return { api, toasts, confirm, stores, unwatch, store: TestBed.inject(RecentImportsStore) };
}

describe('RecentImportsStore', () => {
  describe('load', () => {
    it('lists the imports of the API and marks the store loaded', async () => {
      const { store } = await setup();
      expect(store.loaded()).toBe(false);

      await store.load();

      expect(store.items().map((item) => item.id)).toEqual(['a', 'b']);
      expect(store.loaded()).toBe(true);
    });

    it('keeps the list when a reload fails', async () => {
      const { store, api } = await setup();
      await store.load();
      api.list.mockReturnValue(throwError(() => new Error('offline')));

      await store.load();

      expect(store.items().map((item) => item.id)).toEqual(['a', 'b']);
      expect(store.loaded()).toBe(true);
    });
  });

  describe('undo', () => {
    it('asks first, undoes through the API, removes the item and shows a toast', async () => {
      const { store, api, confirm, toasts, stores, unwatch } = await setup();
      await store.load();

      const done = await store.undo('a', 5);

      expect(done).toBe(true);
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Undo this import?',
          confirmLabel: 'Undo import',
          cancelLabel: 'Cancel',
        }),
      );
      expect(api.undo).toHaveBeenCalledWith('a');
      expect(unwatch).toHaveBeenCalledWith('a');
      expect(store.items().map((item) => item.id)).toEqual(['b']);
      expect(store.undoing()).toBeNull();
      expect(toasts).toEqual([
        { kind: TOAST_KIND.Success, title: 'Import undone', detail: '5 links moved to Trash' },
      ]);
      for (const refresh of [
        stores.folders,
        stores.tags,
        stores.trash,
        stores.pins,
        stores.reminders,
        stores.links,
      ]) {
        expect(refresh).toHaveBeenCalled();
      }
      expect(stores.post).toHaveBeenCalledWith({ kind: TAB_SYNC_KIND.LibraryChanged });
    });

    it('words the confirmation and the result in the singular for one link', async () => {
      const { store, api, confirm, toasts } = await setup();
      api.undo.mockReturnValue(of({ links: 1, folders: 0, tags: 0 }));
      await store.load();

      await store.undo('a', 1);

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('The 1 link and') }),
      );
      expect(toasts[0].detail).toBe('1 link moved to Trash');
    });

    it('does nothing when the confirmation is cancelled', async () => {
      const { store, api, toasts } = await setup(false);
      await store.load();

      const done = await store.undo('a', 5);

      expect(done).toBe(false);
      expect(api.undo).not.toHaveBeenCalled();
      expect(store.items()).toHaveLength(2);
      expect(toasts).toEqual([]);
    });

    it('shows a danger toast and reloads the list when the API fails', async () => {
      const { store, api, toasts } = await setup();
      await store.load();
      api.undo.mockReturnValue(throwError(() => new Error('conflict')));
      api.list.mockClear();

      const done = await store.undo('a', 5);

      expect(done).toBe(false);
      expect(toasts).toEqual([
        { kind: TOAST_KIND.Danger, title: 'Could not undo the import. Try again.' },
      ]);
      expect(store.undoing()).toBeNull();
      expect(api.list).toHaveBeenCalledTimes(1);
    });

    it('ignores a second undo while one is running', async () => {
      const { store, api, confirm } = await setup();
      await store.load();
      let release: () => void = () => undefined;
      api.undo.mockReturnValueOnce(
        new Observable<{ links: number; folders: number; tags: number }>((subscriber) => {
          release = () => {
            subscriber.next({ links: 5, folders: 1, tags: 0 });
            subscriber.complete();
          };
        }),
      );

      const first = store.undo('a', 5);
      await vi.waitFor(() => expect(store.undoing()).toBe('a'));
      const second = await store.undo('b', 5);
      release();

      expect(second).toBe(false);
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(await first).toBe(true);
    });
  });

  it('forgets the imports when the session ends', async () => {
    const { store } = await setup();
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });
});
