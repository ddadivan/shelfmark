import { TestBed } from '@angular/core/testing';
import {
  FOLDER_DELETE_MODE,
  FOLDER_LIMIT,
  type FolderResponse,
  type ListFoldersResponse,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import type { FoldersApi } from '../features/links/models/folders-api.interface';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { FoldersStore } from './folders.store';
import { LinksStore } from './links.store';

function folder(id: string, parentId: string | null, linkCount = 0): FolderResponse {
  return { ...MOCK_FOLDERS[0], id, parentId, name: id, linkCount };
}

// a (1 link) -> b (2 links) -> c (3 links); d at the top (4 links)
const LIST: ListFoldersResponse = {
  items: [folder('a', null, 1), folder('b', 'a', 2), folder('c', 'b', 3), folder('d', null, 4)],
  counts: MOCK_LIBRARY_COUNTS,
};

function setup(overrides: Partial<FoldersApi> = {}) {
  const api = {
    list: vi.fn<FoldersApi['list']>(() => of(LIST)),
    create: vi.fn<FoldersApi['create']>((request) =>
      of({ ...folder('new', request.parentId ?? null), name: request.name }),
    ),
    update: vi.fn<FoldersApi['update']>((id) => of({ ...folder(id, null), updatedAt: 'later' })),
    remove: vi.fn<FoldersApi['remove']>(() => of(undefined)),
    ...overrides,
  };
  const linksApi = {
    list: vi.fn<LinksApi['list']>(() =>
      of({
        items: [
          { ...MOCK_LINKS[0], id: 'l1', folderId: 'b' },
          { ...MOCK_LINKS[0], id: 'l2', folderId: 'd' },
          { ...MOCK_LINKS[0], id: 'l3', folderId: null },
        ],
        nextCursor: null,
      }),
    ),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: FOLDERS_API, useValue: api },
      { provide: LINKS_API, useValue: linksApi },
    ],
  });
  return { api, store: TestBed.inject(FoldersStore) };
}

const names = (store: InstanceType<typeof FoldersStore>) => store.entities().map((item) => item.id);

describe('FoldersStore', () => {
  describe('load', () => {
    it('loads the list, the counts and the tree', async () => {
      const { store } = setup();

      await store.load();

      expect(store.loaded()).toBe(true);
      expect(store.counts()).toEqual(MOCK_LIBRARY_COUNTS);
      expect(store.tree().map((node) => node.folder.id)).toEqual(['a', 'd']);
      expect(store.tree()[0].children[0].children[0].folder.id).toBe('c');
    });

    it('asks once for concurrent and later calls', async () => {
      const { api, store } = setup();

      await Promise.all([store.load(), store.load()]);
      await store.load();

      expect(api.list).toHaveBeenCalledTimes(1);
    });

    it('flags a failed first load and retries on the next call', async () => {
      const list = vi
        .fn<FoldersApi['list']>()
        .mockReturnValueOnce(throwError(() => new Error('down')))
        .mockReturnValue(of(LIST));
      const { store } = setup({ list });

      await store.load();
      expect(store.error()).toBe(true);
      expect(store.loaded()).toBe(false);

      await store.load();
      expect(store.error()).toBe(false);
      expect(store.loaded()).toBe(true);
    });

    it('keeps the list when a refresh fails', async () => {
      const list = vi
        .fn<FoldersApi['list']>()
        .mockReturnValueOnce(of(LIST))
        .mockReturnValue(throwError(() => new Error('down')));
      const { store } = setup({ list });
      await store.load();

      await store.refresh();

      expect(store.error()).toBe(false);
      expect(names(store)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('does not refresh before the first load', async () => {
      const { api, store } = setup();

      await store.refresh();

      expect(api.list).not.toHaveBeenCalled();
    });
  });

  describe('tree helpers', () => {
    it('answers descendants, the path and the subtree link count', async () => {
      const { store } = setup();
      await store.load();

      expect(store.descendantIds('a')).toEqual(['b', 'c']);
      expect(store.pathTo('c').map((item) => item.id)).toEqual(['a', 'b', 'c']);
      expect(store.subtreeLinkCount('a')).toBe(6);
      expect(store.subtreeLinkCount('d')).toBe(4);
    });

    it('reports the per-user limit', async () => {
      const items = Array.from({ length: FOLDER_LIMIT.PerUserMax }, (_, i) =>
        folder(`f${i}`, null),
      );
      const { store } = setup({ list: () => of({ items, counts: MOCK_LIBRARY_COUNTS }) });

      await store.load();

      expect(store.atLimit()).toBe(true);
    });
  });

  describe('create', () => {
    it('waits for the server, then adds the folder in name order', async () => {
      const pending = new Subject<FolderResponse>();
      const { api, store } = setup({ create: vi.fn(() => pending) });
      await store.load();

      const result = store.create('aa', 'a');
      expect(names(store)).toEqual(['a', 'b', 'c', 'd']);
      pending.next({ ...folder('x', 'a'), name: 'aa' });
      pending.complete();

      expect((await result)?.id).toBe('x');
      expect(names(store)).toEqual(['a', 'x', 'b', 'c', 'd']);
      expect(api.create).toHaveBeenCalledWith({ name: 'aa', parentId: 'a' });
    });

    it('leaves out the parent for a top-level folder', async () => {
      const { api, store } = setup();
      await store.load();

      await store.create('root', null);

      expect(api.create).toHaveBeenCalledWith({ name: 'root' });
    });

    it('resolves null and changes nothing when the request fails', async () => {
      const { store } = setup({ create: () => throwError(() => new Error('no')) });
      await store.load();

      expect(await store.create('x', null)).toBeNull();
      expect(names(store)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('rename', () => {
    it('shows the new name at once and keeps it when saved', async () => {
      const pending = new Subject<FolderResponse>();
      const { store } = setup({ update: vi.fn(() => pending) });
      await store.load();

      const result = store.rename('d', 'zzz');
      expect(store.entityMap()['d'].name).toBe('zzz');
      pending.next({ ...folder('d', null), name: 'zzz', updatedAt: 'later' });
      pending.complete();

      expect(await result).toBe(true);
      expect(store.entityMap()['d'].updatedAt).toBe('later');
      expect(names(store)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('puts the old name back when the request fails', async () => {
      const { store } = setup({ update: () => throwError(() => new Error('no')) });
      await store.load();

      expect(await store.rename('a', 'zzz')).toBe(false);
      expect(store.entityMap()['a'].name).toBe('a');
    });

    it('refuses an unknown folder', async () => {
      const { api, store } = setup();
      await store.load();

      expect(await store.rename('nope', 'x')).toBe(false);
      expect(api.update).not.toHaveBeenCalled();
    });
  });

  describe('move', () => {
    it('moves at once and keeps it when saved', async () => {
      const { api, store } = setup();
      await store.load();

      expect(await store.move('c', null)).toBe(true);

      expect(store.entityMap()['c'].parentId).toBeNull();
      expect(api.update).toHaveBeenCalledWith('c', { parentId: null });
    });

    it('moves it back when the request fails', async () => {
      const { store } = setup({ update: () => throwError(() => new Error('no')) });
      await store.load();

      expect(await store.move('c', 'd')).toBe(false);
      expect(store.entityMap()['c'].parentId).toBe('b');
    });

    it.each([
      ['itself', 'a'],
      ['a child', 'b'],
      ['a deeper descendant', 'c'],
    ])('refuses to move a folder into %s without a request', async (_, target) => {
      const { api, store } = setup();
      await store.load();

      expect(await store.move('a', target)).toBe(false);

      expect(api.update).not.toHaveBeenCalled();
      expect(store.entityMap()['a'].parentId).toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes the subtree, tells the links store and reloads the counts', async () => {
      const after: ListFoldersResponse = {
        items: [folder('d', null, 4)],
        counts: { all: 9, unsorted: 8, favorites: 7 },
      };
      const list = vi
        .fn<FoldersApi['list']>()
        .mockReturnValueOnce(of(LIST))
        .mockReturnValue(of(after));
      const { api, store } = setup({ list });
      await store.load();
      const links = TestBed.inject(LinksStore);
      links.setFilter({ scope: LINKS_SCOPE.All });

      expect(await store.remove('a', FOLDER_DELETE_MODE.MoveToUnsorted)).toBe(true);

      expect(api.remove).toHaveBeenCalledWith('a', 'move-to-unsorted');
      expect(names(store)).toEqual(['d']);
      expect(links.entityMap()['l1'].folderId).toBeNull();
      expect(links.entityMap()['l2'].folderId).toBe('d');
      await vi.waitFor(() => {
        expect(store.counts()).toEqual(after.counts);
      });
      expect(api.list).toHaveBeenCalledTimes(2);
    });

    it('drops the links of the subtree in delete mode', async () => {
      const { store } = setup();
      await store.load();
      const links = TestBed.inject(LinksStore);
      links.setFilter({ scope: LINKS_SCOPE.All });

      await store.remove('a', FOLDER_DELETE_MODE.DeleteLinks);

      expect(links.entities().map((link) => link.id)).toEqual(['l2', 'l3']);
    });

    it('changes nothing when the request fails', async () => {
      const { store } = setup({ remove: () => throwError(() => new Error('no')) });
      await store.load();

      expect(await store.remove('a', FOLDER_DELETE_MODE.DeleteLinks)).toBe(false);
      expect(names(store)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('reset', () => {
    it('forgets everything', async () => {
      const { store } = setup();
      await store.load();

      store.reset();

      expect(store.loaded()).toBe(false);
      expect(store.count()).toBe(0);
      expect(store.counts()).toEqual({ all: 0, unsorted: 0, favorites: 0 });
    });

    it('drops a list that arrives after the reset', async () => {
      const pending = new Subject<ListFoldersResponse>();
      const { store } = setup({ list: () => pending });
      const loading = store.load();

      store.reset();
      pending.next(LIST);
      pending.complete();
      await loading;

      expect(store.loaded()).toBe(false);
      expect(store.count()).toBe(0);
    });

    it('drops a created folder that arrives after the reset', async () => {
      const pending = new Subject<FolderResponse>();
      const { store } = setup({ create: () => pending });
      await store.load();

      const result = store.create('late', null);
      store.reset();
      pending.next(folder('late', null));
      pending.complete();

      expect(await result).toBeNull();
      expect(store.count()).toBe(0);
    });

    it('does not put a rolled-back name into the next session', async () => {
      const pending = new Subject<FolderResponse>();
      const { store } = setup({ update: () => pending });
      await store.load();

      const result = store.rename('a', 'zzz');
      store.reset();
      pending.error(new Error('no'));

      expect(await result).toBe(false);
      expect(store.count()).toBe(0);
    });
  });

  it('shows a pending first load', () => {
    const { store } = setup({ list: () => NEVER });

    void store.load();

    expect(store.loading()).toBe(true);
  });
});
