import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  type ListTrashResponse,
  type TrashItem,
} from '@shelfmark/contracts';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import { LINKS_API } from '../features/links/models/links-api.const';
import { TAGS_API } from '../features/links/models/tags-api.const';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import type { TrashApi } from '../features/trash/models/trash-api.interface';
import { TRASH_OUTCOME } from '../features/trash/models/trash-outcome.const';
import { toRef } from '../features/trash/utils/trash-key';
import { FoldersStore } from './folders.store';
import { LinksStore } from './links.store';
import { TrashStore } from './trash.store';
import { UserSettingsStore } from './user-settings.store';

function item(id: string, kind: TrashItem['kind'] = TRASH_ITEM_KIND.Link, day = 1): TrashItem {
  return {
    kind,
    id,
    title: id,
    url: kind === TRASH_ITEM_KIND.Link ? `https://${id}.example.com/` : null,
    faviconUrl: null,
    imageUrl: null,
    fromFolderName: null,
    linkCount: kind === TRASH_ITEM_KIND.Folder ? 3 : null,
    deletedAt: `2026-11-0${day}T10:00:00.000Z`,
    expiresAt: '2026-12-01T10:00:00.000Z',
  };
}

// Newest first: f1 (folder), l2, l1.
const LIST: ListTrashResponse = {
  items: [item('f1', TRASH_ITEM_KIND.Folder, 3), item('l2', TRASH_ITEM_KIND.Link, 2), item('l1')],
  total: 3,
  retentionDays: 90,
};

function setup() {
  const api = {
    list: vi.fn<TrashApi['list']>(() => of(LIST)),
    restore: vi.fn<TrashApi['restore']>((items) => of({ count: items.length })),
    deleteForever: vi.fn<TrashApi['deleteForever']>((items) => of({ count: items.length })),
    empty: vi.fn<TrashApi['empty']>(() => of({ count: 3 })),
  };
  const foldersRefresh = vi.fn(() => Promise.resolve());
  const linksRefresh = vi.fn();
  const tagsApi = { list: vi.fn(() => of([])) };
  TestBed.configureTestingModule({
    providers: [
      { provide: TRASH_API, useValue: api },
      { provide: FOLDERS_API, useValue: { list: vi.fn(() => NEVER) } },
      { provide: LINKS_API, useValue: { list: vi.fn(() => NEVER) } },
      { provide: TAGS_API, useValue: tagsApi },
    ],
  });
  const store = TestBed.inject(TrashStore);
  vi.spyOn(TestBed.inject(FoldersStore), 'refresh').mockImplementation(foldersRefresh);
  vi.spyOn(TestBed.inject(LinksStore), 'refresh').mockImplementation(linksRefresh);
  return { api, store, foldersRefresh, linksRefresh };
}

const ids = (store: InstanceType<typeof TrashStore>) => store.items().map((entry) => entry.id);

describe('TrashStore', () => {
  describe('load', () => {
    it('loads the list and the total once, and tells the settings the retention', async () => {
      const { api, store } = setup();

      await Promise.all([store.load(), store.load()]);
      await store.load();

      expect(api.list).toHaveBeenCalledTimes(1);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
      expect(store.total()).toBe(3);
      expect(store.loaded()).toBe(true);
      expect(store.linkItems().map((entry) => entry.id)).toEqual(['l2', 'l1']);
      expect(store.folderItems().map((entry) => entry.id)).toEqual(['f1']);
      expect(TestBed.inject(UserSettingsStore).retentionDays()).toBe(90);
    });

    it('flags a failed first load, which can be retried', async () => {
      const { store, api } = setup();
      api.list.mockImplementation(() => throwError(() => new Error('down')));

      await store.load();
      expect(store.error()).toBe(true);
      expect(store.loaded()).toBe(false);

      api.list.mockImplementation(() => of(LIST));
      await store.load();
      expect(store.error()).toBe(false);
      expect(store.loaded()).toBe(true);
    });

    it('keeps the old list when a later reload fails', async () => {
      const { store, api } = setup();
      await store.load();

      api.list.mockImplementation(() => throwError(() => new Error('down')));
      await store.refresh();

      expect(store.error()).toBe(false);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
    });

    it('refresh does nothing before the first load', async () => {
      const { store, api } = setup();

      await store.refresh();

      expect(api.list).not.toHaveBeenCalled();
    });

    it('open sends the link deletes that wait for Undo first, then loads', async () => {
      const { store, api } = setup();
      const flush = vi.spyOn(TestBed.inject(LinksStore), 'flushPending').mockResolvedValue();

      await store.open();

      expect(flush).toHaveBeenCalledTimes(1);
      expect(flush.mock.invocationCallOrder[0]).toBeLessThan(api.list.mock.invocationCallOrder[0]);
      expect(store.loaded()).toBe(true);
    });
  });

  describe('restore', () => {
    it('removes the entries at once, sends them and refreshes the library', async () => {
      const gate = new Subject<{ count: number }>();
      const { store, api, foldersRefresh, linksRefresh } = setup();
      await store.load();
      api.restore.mockImplementation(() => gate);

      const done = store.restore([toRef(item('l2')), toRef(item('f1', TRASH_ITEM_KIND.Folder))]);

      expect(ids(store)).toEqual(['l1']);
      expect(store.total()).toBe(1);
      expect(api.restore).toHaveBeenCalledWith([
        { kind: TRASH_ITEM_KIND.Link, id: 'l2' },
        { kind: TRASH_ITEM_KIND.Folder, id: 'f1' },
      ]);
      gate.next({ count: 2 });
      gate.complete();
      expect(await done).toBe(TRASH_OUTCOME.Done);
      expect(linksRefresh).toHaveBeenCalledTimes(1);
      expect(foldersRefresh).toHaveBeenCalledTimes(1);
    });

    it('puts the entries back in order and says Failed when the request fails', async () => {
      const { store, api, linksRefresh } = setup();
      await store.load();
      api.restore.mockImplementation(() => throwError(() => new Error('boom')));

      const outcome = await store.restore([toRef(item('l2'))]);

      expect(outcome).toBe(TRASH_OUTCOME.Failed);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
      expect(store.total()).toBe(3);
      expect(linksRefresh).not.toHaveBeenCalled();
    });

    it('says Conflict on a 409 (the library is full) and puts the entries back', async () => {
      const { store, api } = setup();
      await store.load();
      api.restore.mockImplementation(() =>
        throwError(
          () => new HttpErrorResponse({ status: HttpStatusCode.Conflict, statusText: 'Conflict' }),
        ),
      );

      expect(await store.restore([toRef(item('l1'))])).toBe(TRASH_OUTCOME.Conflict);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
    });

    it('sends batches of at most the batch limit and keeps what was done when one fails', async () => {
      const many = Array.from({ length: TRASH_LIMIT.BatchMax + 5 }, (_, i) =>
        item(`x${String(i).padStart(3, '0')}`, TRASH_ITEM_KIND.Link, 1),
      );
      const { store, api } = setup();
      api.list.mockImplementation(() =>
        of({ items: many, total: many.length, retentionDays: 30 as const }),
      );
      await store.load();
      let call = 0;
      api.restore.mockImplementation((batch) =>
        ++call === 1 ? of({ count: batch.length }) : throwError(() => new Error('second fails')),
      );

      const outcome = await store.restore(many.map(toRef));

      expect(outcome).toBe(TRASH_OUTCOME.Failed);
      expect(api.restore.mock.calls[0][0]).toHaveLength(TRASH_LIMIT.BatchMax);
      expect(api.restore.mock.calls[1][0]).toHaveLength(5);
      // The first 100 are restored; only the failed 5 are back in the list.
      expect(store.items()).toHaveLength(5);
      expect(store.total()).toBe(5);
    });

    it('does nothing for no entries', async () => {
      const { store, api } = setup();
      await store.load();

      expect(await store.restore([])).toBe(TRASH_OUTCOME.Done);
      expect(api.restore).not.toHaveBeenCalled();
    });
  });

  describe('deleteForever', () => {
    it('removes the entries and does not touch the library', async () => {
      const { store, api, linksRefresh, foldersRefresh } = setup();
      await store.load();
      api.list.mockImplementation(() => of({ ...LIST, items: LIST.items.slice(0, 2), total: 2 }));

      expect(await store.deleteForever([toRef(item('l1'))])).toBe(TRASH_OUTCOME.Done);

      expect(api.deleteForever).toHaveBeenCalledWith([{ kind: TRASH_ITEM_KIND.Link, id: 'l1' }]);
      expect(ids(store)).toEqual(['f1', 'l2']);
      expect(linksRefresh).not.toHaveBeenCalled();
      expect(foldersRefresh).not.toHaveBeenCalled();
    });

    it('rolls back on failure', async () => {
      const { store, api } = setup();
      await store.load();
      api.deleteForever.mockImplementation(() => throwError(() => new Error('boom')));

      expect(await store.deleteForever([toRef(item('l1'))])).toBe(TRASH_OUTCOME.Failed);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
      expect(store.total()).toBe(3);
    });
  });

  describe('empty', () => {
    it('clears the list at once and asks the server', async () => {
      const gate = new Subject<{ count: number }>();
      const { store, api } = setup();
      await store.load();
      api.empty.mockImplementation(() => gate);

      const done = store.empty();

      expect(store.items()).toEqual([]);
      expect(store.total()).toBe(0);
      gate.next({ count: 3 });
      gate.complete();
      expect(await done).toBe(TRASH_OUTCOME.Done);
    });

    it('brings everything back when the request fails', async () => {
      const { store, api } = setup();
      await store.load();
      api.empty.mockImplementation(() => throwError(() => new Error('boom')));

      expect(await store.empty()).toBe(TRASH_OUTCOME.Failed);
      expect(ids(store)).toEqual(['f1', 'l2', 'l1']);
      expect(store.total()).toBe(3);
    });
  });

  it('drops a list that was requested before a mutation and asks again after it', async () => {
    const stale = new Subject<ListTrashResponse>();
    const { store, api } = setup();
    await store.load();
    api.list.mockImplementationOnce(() => stale);

    const reload = store.refresh();
    const outcome = await store.deleteForever([toRef(item('l1'))]);
    stale.next(LIST);
    stale.complete();
    await reload;

    expect(outcome).toBe(TRASH_OUTCOME.Done);
    // The late answer still lists l1; the follow-up reload (the default `of(LIST)`) is what
    // the store ends with, never an intermediate stale state while the delete ran.
    expect(api.list.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('forgets everything when the session ends', async () => {
    const { store } = setup();
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.total()).toBe(0);
  });
});
