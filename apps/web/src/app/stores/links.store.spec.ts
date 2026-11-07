import { TestBed } from '@angular/core/testing';
import {
  FOLDER_DELETE_MODE,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { LinksStore } from './links.store';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}`, isFavorite: false, ...changes };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor };
}

function setup({ items = [link(1), link(2), link(3)] }: { items?: LinkResponse[] } = {}) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page(items))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [link(2)] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of(link(Number(id.slice(3)), { ...request, updatedAt: 'later' })),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
    open: vi.fn<LinksApi['open']>((id) =>
      of(link(Number(id.slice(3)), { lastOpenedAt: '2026-11-07T10:00:00.000Z' })),
    ),
    preview: vi.fn(),
    create: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [{ provide: LINKS_API, useValue: api }] });
  return { api, store: TestBed.inject(LinksStore) };
}

const ids = (store: InstanceType<typeof LinksStore>) => store.entities().map((item) => item.id);

describe('LinksStore', () => {
  it('loads page one of a scope with its query', () => {
    const { api, store } = setup();

    store.setFilter({ scope: LINKS_SCOPE.Favorites });

    expect(api.list).toHaveBeenCalledWith({ favorite: true });
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('asks only for unsorted links in the unsorted scope', () => {
    const { api, store } = setup();

    store.setFilter({ scope: LINKS_SCOPE.Unsorted });

    expect(api.list).toHaveBeenCalledWith({ unsorted: true });
  });

  it('keeps the links while the same scope refetches and clears them on another scope', () => {
    const pageOne = new Subject<ListLinksResponse>();
    const { api, store } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });
    api.list.mockReturnValueOnce(pageOne);

    store.setFilter({ scope: LINKS_SCOPE.All });
    expect(store.loading()).toBe(true);
    expect(store.count()).toBe(3);

    api.list.mockReturnValueOnce(NEVER);
    store.setFilter({ scope: LINKS_SCOPE.Favorites });
    expect(store.count()).toBe(0);
    expect(store.loaded()).toBe(false);
  });

  it('cancels the request of the previous filter (switchMap)', () => {
    const first = new Subject<ListLinksResponse>();
    const { api, store } = setup();
    api.list.mockReturnValueOnce(first);
    store.setFilter({ scope: LINKS_SCOPE.All });

    store.setFilter({ scope: LINKS_SCOPE.Favorites });
    first.next(page([link(99)]));

    expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(first.observed).toBe(false);
  });

  it('reports a failed first load and recovers on retry', () => {
    const { api, store } = setup();
    api.list.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.setFilter({ scope: LINKS_SCOPE.All });
    expect(store.error()).toBe(true);
    expect(store.loading()).toBe(false);

    store.setFilter({ scope: LINKS_SCOPE.All });
    expect(store.error()).toBe(false);
    expect(store.count()).toBe(3);
  });

  describe('load more', () => {
    it('appends the next page with the cursor and stops on the last one', async () => {
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1)], 'c1')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      expect(store.hasMore()).toBe(true);
      api.list.mockReturnValueOnce(of(page([link(2)])));

      await store.loadMore();

      expect(api.list).toHaveBeenLastCalledWith({ cursor: 'c1' });
      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(store.hasMore()).toBe(false);
      await store.loadMore();
      expect(api.list).toHaveBeenCalledTimes(2);
    });

    it('does not start a second request while one runs', async () => {
      const second = new Subject<ListLinksResponse>();
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1)], 'c1')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.list.mockReturnValueOnce(second);

      const running = store.loadMore();
      await store.loadMore();
      expect(api.list).toHaveBeenCalledTimes(2);
      expect(store.loadingMore()).toBe(true);

      second.next(page([link(2)]));
      second.complete();
      await running;
      expect(store.loadingMore()).toBe(false);
    });

    it('keeps the button available after a failure', async () => {
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1)], 'c1')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.list.mockReturnValueOnce(throwError(() => new Error('boom')));

      await store.loadMore();

      expect(store.loadMoreFailed()).toBe(true);
      expect(store.hasMore()).toBe(true);
    });

    it('drops a page that arrives after the scope changed', async () => {
      const late = new Subject<ListLinksResponse>();
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1)], 'c1')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.list.mockReturnValueOnce(late);
      const running = store.loadMore();

      api.list.mockReturnValueOnce(of(page([link(7)])));
      store.setFilter({ scope: LINKS_SCOPE.Favorites });
      late.next(page([link(2)]));
      late.complete();
      await running;

      expect(ids(store)).toEqual(['id-7']);
    });
  });

  describe('favorite', () => {
    it('flips the flag at once and keeps it when the request succeeds', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      const done = store.toggleFavorite('id-1');
      expect(store.entityMap()['id-1']?.isFavorite).toBe(true);

      expect(await done).toBe(true);
      expect(api.update).toHaveBeenCalledWith('id-1', { isFavorite: true });
      expect(store.entityMap()['id-1']?.isFavorite).toBe(true);
    });

    it('rolls back and resolves false when the request fails', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.update.mockReturnValueOnce(throwError(() => new Error('boom')));

      expect(await store.toggleFavorite('id-1')).toBe(false);
      expect(store.entityMap()['id-1']?.isFavorite).toBe(false);
    });

    it('keeps an unfavorited link in the favorites feed until the next load', async () => {
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1, { isFavorite: true })])));
      store.setFilter({ scope: LINKS_SCOPE.Favorites });

      await store.toggleFavorite('id-1');

      expect(ids(store)).toEqual(['id-1']);
      expect(store.entityMap()['id-1']?.isFavorite).toBe(false);
    });
  });

  describe('delete with Undo', () => {
    it('hides the link and sends the request only on commit', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      expect(store.remove('id-2')).toBe(true);
      expect(ids(store)).toEqual(['id-1', 'id-3']);
      expect(api.remove).not.toHaveBeenCalled();

      expect(await store.commitRemove('id-2')).toBe(true);
      expect(api.remove).toHaveBeenCalledWith('id-2');
      expect(ids(store)).toEqual(['id-1', 'id-3']);
    });

    it('puts the link back in place on undo, without a request', () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');

      store.undoRemove('id-2');

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('restores the link and resolves false when the delete fails', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.remove.mockReturnValueOnce(throwError(() => new Error('boom')));
      store.remove('id-2');

      expect(await store.commitRemove('id-2')).toBe(false);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('also removes the link from the recent panel and restores it on undo', async () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();
      expect(store.recent().map((item) => item.id)).toEqual(['id-2']);

      store.remove('id-2');
      expect(store.recent()).toEqual([]);
      store.undoRemove('id-2');
      expect(store.recent().map((item) => item.id)).toEqual(['id-2']);
    });

    it('does not bring a hidden link back when a refetch lists it again', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');

      store.setFilter({ scope: LINKS_SCOPE.All });

      expect(ids(store)).toEqual(['id-1', 'id-3']);
    });

    it('does not send waiting deletes on reset', () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      store.reset();
      expect(api.remove).not.toHaveBeenCalled();
    });

    it('flushes every waiting delete', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');
      store.remove('id-3');

      await store.flushPending();

      expect(api.remove).toHaveBeenCalledTimes(2);
    });

    it('flushes waiting deletes on pagehide', () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      window.dispatchEvent(new Event('pagehide'));

      expect(api.remove).toHaveBeenCalledWith('id-1');
    });

    it('ignores a link that is not in the feed', () => {
      const { store } = setup();
      expect(store.remove('nope')).toBe(false);
    });
  });

  describe('recent and open', () => {
    it('loads the recent list', async () => {
      const { api, store } = setup();

      await store.loadRecent();

      expect(api.recent).toHaveBeenCalledWith({ limit: 8 });
      expect(store.recentLoaded()).toBe(true);
    });

    it('moves an opened link to the top of the recent list', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      await store.recordOpen('id-1');

      expect(api.open).toHaveBeenCalledWith('id-1');
      expect(store.recent().map((item) => item.id)).toEqual(['id-1', 'id-2']);
      expect(store.entityMap()['id-1']?.lastOpenedAt).toBe('2026-11-07T10:00:00.000Z');
    });

    it('ignores a failed open', async () => {
      const { api, store } = setup();
      api.open.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.recordOpen('id-1')).resolves.toBeUndefined();
      expect(store.recent()).toEqual([]);
    });
  });

  describe('saved and edited links', () => {
    it('shows a saved link at the top of the all scope', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.addSaved(link(9));

      expect(ids(store)[0]).toBe('id-9');
    });

    it('does not show a saved link that is not a favorite in the favorites scope', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Favorites });

      store.addSaved(link(9));

      expect(ids(store)).not.toContain('id-9');
    });

    it('does not show a foldered link in the unsorted scope', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Unsorted });

      store.addSaved(link(9, { folderId: 'f1' }));
      store.addSaved(link(10, { folderId: null }));

      expect(ids(store)).toContain('id-10');
      expect(ids(store)).not.toContain('id-9');
    });

    it('removes an edited link that no longer belongs in Unsorted', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Unsorted });

      store.applyEdit(link(2, { folderId: 'f1' }));

      expect(ids(store)).not.toContain('id-2');
    });

    it('keeps an unfavorited link in Favorites until the next load', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Favorites });

      store.applyEdit(link(2, { isFavorite: false }));

      expect(ids(store)).toContain('id-2');
    });

    it('applies an edit from the server', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.applyEdit(link(2, { title: 'Renamed' }));

      expect(store.entityMap()['id-2']?.title).toBe('Renamed');
    });
  });

  describe('folder and tag filters', () => {
    it('asks for the links of a folder, with tags and search', () => {
      const { api, store } = setup();

      store.setFilter({
        scope: LINKS_SCOPE.Folder,
        folderId: 'f1',
        tags: ['a', 'b'],
        q: 'ng',
      });

      expect(api.list).toHaveBeenCalledWith({ folderId: 'f1', tag: ['a', 'b'], q: 'ng' });
    });

    it('clears the feed when only the folder changes', () => {
      const pageTwo = new Subject<ListLinksResponse>();
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: 'f1' });
      api.list.mockReturnValueOnce(pageTwo);

      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: 'f2' });

      expect(store.count()).toBe(0);
      expect(store.loaded()).toBe(false);
    });

    it('shows a saved link in a folder feed only for that folder', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: 'f1' });

      store.addSaved(link(8, { folderId: 'f2' }));
      store.addSaved(link(9, { folderId: 'f1' }));

      expect(ids(store)).toEqual(['id-9', 'id-1', 'id-2', 'id-3']);
    });

    it('moves the links of a deleted folder to unsorted, or drops them', () => {
      const { store } = setup({
        items: [link(1, { folderId: 'f1' }), link(2, { folderId: 'f9' })],
      });
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.applyFolderRemoval(['f1'], FOLDER_DELETE_MODE.MoveToUnsorted);
      expect(store.entityMap()['id-1'].folderId).toBeNull();
      expect(store.entityMap()['id-2'].folderId).toBe('f9');

      store.applyFolderRemoval(['f9'], FOLDER_DELETE_MODE.DeleteLinks);
      expect(ids(store)).toEqual(['id-1']);
    });
  });

  describe('folder removal and links in their Undo window', () => {
    it('Undo brings a link back without the deleted folder', () => {
      const { store } = setup({ items: [link(1, { folderId: 'f1' }), link(2)] });
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      store.applyFolderRemoval(['f1'], FOLDER_DELETE_MODE.MoveToUnsorted);
      store.undoRemove('id-1');

      expect(store.entityMap()['id-1'].folderId).toBeNull();
    });

    it('Undo cannot bring back a link deleted with its folder', async () => {
      const { api, store } = setup({ items: [link(1, { folderId: 'f1' }), link(2)] });
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      store.applyFolderRemoval(['f1'], FOLDER_DELETE_MODE.DeleteLinks);
      store.undoRemove('id-1');

      expect(ids(store)).toEqual(['id-2']);
      expect(await store.commitRemove('id-1')).toBe(true);
      expect(api.remove).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('forgets the feed, the recent list and the scope', async () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Favorites });
      await store.loadRecent();

      store.reset();

      expect(store.count()).toBe(0);
      expect(store.recent()).toEqual([]);
      expect(store.loaded()).toBe(false);
      expect(store.scope()).toBe(LINKS_SCOPE.All);
    });

    it('drops a first page, a recent list and an open that arrive after the reset', async () => {
      const list = new Subject<ListLinksResponse>();
      const recent = new Subject<{ items: LinkResponse[] }>();
      const open = new Subject<LinkResponse>();
      const { api, store } = setup();
      api.list.mockReturnValueOnce(list);
      api.recent.mockReturnValueOnce(recent);
      api.open.mockReturnValueOnce(open);
      store.setFilter({ scope: LINKS_SCOPE.All });
      const loadingRecent = store.loadRecent();
      const opening = store.recordOpen('id-1');

      store.reset();
      list.next(page([link(1)]));
      recent.next({ items: [link(1)] });
      recent.complete();
      open.next(link(1));
      open.complete();
      await Promise.all([loadingRecent, opening]);

      expect(store.count()).toBe(0);
      expect(store.recent()).toEqual([]);
      expect(store.recentLoaded()).toBe(false);
      expect(store.loading()).toBe(false);
    });

    it('drops a failure that arrives after the reset', () => {
      const list = new Subject<ListLinksResponse>();
      const { api, store } = setup();
      api.list.mockReturnValueOnce(list);
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.reset();
      list.error(new Error('boom'));

      expect(store.error()).toBe(false);
    });

    it('drops a page that arrives after the reset', async () => {
      const late = new Subject<ListLinksResponse>();
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1)], 'c1')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      api.list.mockReturnValueOnce(late);
      const running = store.loadMore();

      store.reset();
      late.next(page([link(2)]));
      late.complete();
      await running;

      expect(store.count()).toBe(0);
    });
  });
});
