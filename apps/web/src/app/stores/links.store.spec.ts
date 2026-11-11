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
import { RECENT_LINKS_LIMIT } from '../features/links/models/recent-links-limit.const';
import { LinksStore } from './links.store';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return { ...MOCK_LINKS[0], id: `id-${n}`, title: `Link ${n}`, isFavorite: false, ...changes };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor, pinned: [] };
}

function setup({ items = [link(1), link(2), link(3)] }: { items?: LinkResponse[] } = {}) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page(items))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [link(2)] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of(link(Number(id.slice(3)), { ...request, updatedAt: 'later' })),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
    removeRecent: vi.fn<LinksApi['removeRecent']>(() => of(undefined)),
    clearRecent: vi.fn<LinksApi['clearRecent']>(() => of(undefined)),
    open: vi.fn<LinksApi['open']>((id) =>
      of(link(Number(id.slice(3)), { lastOpenedAt: '2026-11-07T10:00:00.000Z' })),
    ),
    captureImages: vi.fn<LinksApi['captureImages']>((id) =>
      of(
        link(Number(id.slice(3)), {
          faviconUrl: `/api/links/${id}/favicon?v=0123456789abcdef`,
          imageUrl: `/api/links/${id}/image?v=0123456789abcdef`,
        }),
      ),
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

  describe('tab sync', () => {
    it('drops a link another tab deleted from the feed and the recent list', async () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      store.applyRemoval('id-2');

      expect(ids(store)).toEqual(['id-1', 'id-3']);
      expect(store.recent()).toEqual([]);
    });

    it('keeps a link whose own delete is waiting for Undo', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');

      store.applyRemoval('id-2');
      store.undoRemove('id-2');

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('reloads the open feed and the recent list, and nothing before the first load', async () => {
      const { api, store } = setup();
      store.refresh();
      expect(api.list).not.toHaveBeenCalled();
      expect(api.recent).not.toHaveBeenCalled();

      store.setFilter({ scope: LINKS_SCOPE.Favorites });
      await store.loadRecent();
      store.refresh();
      await Promise.resolve();

      expect(api.list).toHaveBeenCalledTimes(2);
      expect(api.list).toHaveBeenLastCalledWith({ favorite: true });
      expect(api.recent).toHaveBeenCalledTimes(2);
    });
  });

  describe('move to a folder', () => {
    const folderA = '019a0000-0000-7000-8000-00000000000a';
    const folderB = '019a0000-0000-7000-8000-00000000000b';

    it('keeps the link in place in a scope it still belongs to and sends the folder', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      const moved = await store.move(link(2), folderA);

      expect(moved).toBe(true);
      expect(api.update).toHaveBeenCalledWith('id-2', { folderId: folderA });
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(store.entityMap()['id-2']?.folderId).toBe(folderA);
      expect(store.entityMap()['id-2']?.updatedAt).toBe('later');
    });

    it('takes the link out of the open folder and puts it back in its slot when moved back', async () => {
      const items = [1, 2, 3].map((n) => link(n, { folderId: folderA }));
      const { store } = setup({ items });
      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: folderA });

      await store.move(items[1], folderB);
      expect(ids(store)).toEqual(['id-1', 'id-3']);

      await store.move({ ...items[1], folderId: folderB }, folderA);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('leaves "Unsorted" when moved into a folder', async () => {
      const items = [link(1, { folderId: null }), link(2, { folderId: null })];
      const { store } = setup({ items });
      store.setFilter({ scope: LINKS_SCOPE.Unsorted });

      await store.move(items[0], folderA);

      expect(ids(store)).toEqual(['id-2']);
    });

    it('rolls back and resolves false when the request fails', async () => {
      const items = [1, 2, 3].map((n) => link(n, { folderId: folderA }));
      const { api, store } = setup({ items });
      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: folderA });
      api.update.mockReturnValueOnce(throwError(() => new Error('offline')));

      const moved = await store.move(items[0], null);

      expect(moved).toBe(false);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(store.entityMap()['id-1']?.folderId).toBe(folderA);
    });

    it('updates the folder of the link in the recent list', async () => {
      const { store } = setup();
      await store.loadRecent();

      await store.move(link(2), folderB);

      expect(store.recent()[0]?.folderId).toBe(folderB);
    });

    it('does not call the API when the folder does not change', async () => {
      const { api, store } = setup({ items: [link(1, { folderId: folderA })] });
      store.setFilter({ scope: LINKS_SCOPE.All });

      expect(await store.move(link(1, { folderId: folderA }), folderA)).toBe(true);
      expect(api.update).not.toHaveBeenCalled();
    });

    it('does not bring a link back into a scope opened after the move', async () => {
      const items = [link(1, { folderId: folderA }), link(2, { folderId: folderA })];
      const { store } = setup({ items });
      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: folderA });
      await store.move(items[0], folderB);

      store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: folderA });
      await store.move({ ...items[0], folderId: folderB }, folderA);

      expect(ids(store)).toEqual(['id-1', 'id-2']);
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

      expect(api.recent).toHaveBeenCalledWith({ limit: RECENT_LINKS_LIMIT });
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

    describe('history', () => {
      const opened = (n: number) => link(n, { lastOpenedAt: '2026-11-07T10:00:00.000Z' });

      it('removes one link from the history, keeping it in the feed', async () => {
        const { api, store } = setup({ items: [opened(1), opened(2)] });
        api.recent.mockReturnValue(of({ items: [opened(1), opened(2)] }));
        store.setFilter({ scope: LINKS_SCOPE.All });
        await store.loadRecent();

        await expect(store.removeFromHistory('id-1')).resolves.toBe(true);

        expect(api.removeRecent).toHaveBeenCalledWith('id-1');
        expect(store.recent().map((item) => item.id)).toEqual(['id-2']);
        expect(store.entityMap()['id-1']?.lastOpenedAt).toBeNull();
        expect(store.entityMap()['id-1']).toBeDefined();
      });

      it('puts the link back in place when removing fails', async () => {
        const { api, store } = setup({ items: [opened(1), opened(2), opened(3)] });
        api.recent.mockReturnValue(of({ items: [opened(1), opened(2), opened(3)] }));
        api.removeRecent.mockReturnValueOnce(throwError(() => new Error('boom')));
        store.setFilter({ scope: LINKS_SCOPE.All });
        await store.loadRecent();

        await expect(store.removeFromHistory('id-2')).resolves.toBe(false);

        expect(store.recent().map((item) => item.id)).toEqual(['id-1', 'id-2', 'id-3']);
        expect(store.entityMap()['id-2']?.lastOpenedAt).toBe('2026-11-07T10:00:00.000Z');
      });

      it('does not call the API for a link that is not in the history', async () => {
        const { api, store } = setup();
        await store.loadRecent();

        await expect(store.removeFromHistory('nope')).resolves.toBe(true);
        expect(api.removeRecent).not.toHaveBeenCalled();
      });

      it('clears the history and the opened time of loaded links', async () => {
        const { api, store } = setup({ items: [opened(1), opened(2)] });
        api.recent.mockReturnValue(of({ items: [opened(1), opened(2)] }));
        store.setFilter({ scope: LINKS_SCOPE.All });
        await store.loadRecent();

        await expect(store.clearHistory()).resolves.toBe(true);

        expect(api.clearRecent).toHaveBeenCalledTimes(1);
        expect(store.recent()).toEqual([]);
        expect(store.entities().every((item) => item.lastOpenedAt === null)).toBe(true);
      });

      it('brings the history back when clearing fails', async () => {
        const { api, store } = setup({ items: [opened(1), opened(2)] });
        api.recent.mockReturnValue(of({ items: [opened(1), opened(2)] }));
        api.clearRecent.mockReturnValueOnce(throwError(() => new Error('boom')));
        store.setFilter({ scope: LINKS_SCOPE.All });
        await store.loadRecent();

        await expect(store.clearHistory()).resolves.toBe(false);

        expect(store.recent().map((item) => item.id)).toEqual(['id-1', 'id-2']);
        expect(store.entityMap()['id-1']?.lastOpenedAt).toBe('2026-11-07T10:00:00.000Z');
      });
    });

    it('ignores a failed open', async () => {
      const { api, store } = setup();
      api.open.mockReturnValueOnce(throwError(() => new Error('boom')));

      await expect(store.recordOpen('id-1')).resolves.toBeUndefined();
      expect(store.recent()).toEqual([]);
    });
  });

  describe('pending image capture (ADR 0027 note)', () => {
    const pendingLink = (n: number): LinkResponse =>
      link(n, {
        faviconUrl: `/api/links/id-${n}/favicon?v=pending`,
        imageUrl: `/api/links/id-${n}/image?v=pending`,
      });

    it('requests the capture of a pending link once and patches the images on success', async () => {
      const { api, store } = setup({ items: [pendingLink(1), link(2)] });

      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() =>
        expect(store.entityMap()['id-1']?.imageUrl).toBe(
          '/api/links/id-1/image?v=0123456789abcdef',
        ),
      );

      expect(api.captureImages).toHaveBeenCalledTimes(1);
      expect(api.captureImages).toHaveBeenCalledWith('id-1');
      expect(store.entityMap()['id-1']?.faviconUrl).toBe(
        '/api/links/id-1/favicon?v=0123456789abcdef',
      );
      expect(store.entityMap()['id-2']?.imageUrl).toBe(MOCK_LINKS[0].imageUrl);
    });

    it('asks once per link while a request runs, even when the link loads again', async () => {
      const running = new Subject<LinkResponse>();
      const { api, store } = setup({ items: [pendingLink(1)] });
      api.captureImages.mockReturnValue(running);
      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(1));

      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();
      store.applyEdit(pendingLink(1));

      expect(api.captureImages).toHaveBeenCalledTimes(1);
    });

    it('does not ask again for a captured link that loads without the marker', async () => {
      const { api, store } = setup({ items: [pendingLink(1)] });
      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() =>
        expect(store.entityMap()['id-1']?.imageUrl).toContain('v=0123456789abcdef'),
      );

      api.list.mockReturnValue(of(page([store.entityMap()['id-1'] as LinkResponse])));
      store.setFilter({ scope: LINKS_SCOPE.All });

      expect(api.captureImages).toHaveBeenCalledTimes(1);
    });

    it('asks again after the store was reset (next session)', async () => {
      const { api, store } = setup({ items: [pendingLink(1)] });
      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(1));

      store.reset();
      store.setFilter({ scope: LINKS_SCOPE.All });

      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(2));
    });

    it('fails silently and keeps the link as it is', async () => {
      const { api, store } = setup({ items: [pendingLink(1)] });
      api.captureImages.mockReturnValue(throwError(() => new Error('boom')));

      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalled());
      await Promise.resolve();

      expect(store.entityMap()['id-1']?.imageUrl).toBe('/api/links/id-1/image?v=pending');
      expect(store.error()).toBe(false);
    });

    it('does not ask for links without the marker or with a hash', async () => {
      const { api, store } = setup({
        items: [
          link(1, { imageUrl: '/api/links/id-1/image?v=0123456789abcdef', faviconUrl: null }),
        ],
      });

      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      expect(api.captureImages).not.toHaveBeenCalled();
    });

    it('asks again when a captured link is edited to a new page (pending again)', async () => {
      const { api, store } = setup({ items: [pendingLink(1)] });
      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() =>
        expect(store.entityMap()['id-1']?.imageUrl).toContain('v=0123456789abcdef'),
      );

      store.applyEdit({ ...pendingLink(1), updatedAt: 'edited' });

      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(2));
    });

    it('drops a response for a version the user edited meanwhile and asks for the new one', async () => {
      const first = new Subject<LinkResponse>();
      const { api, store } = setup({ items: [pendingLink(1)] });
      api.captureImages.mockReturnValueOnce(first);
      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(1));

      store.applyEdit({ ...pendingLink(1), updatedAt: 'edited' });
      first.next(
        link(1, {
          faviconUrl: '/api/links/id-1/favicon?v=aaaaaaaaaaaaaaaa',
          imageUrl: '/api/links/id-1/image?v=aaaaaaaaaaaaaaaa',
        }),
      );
      first.complete();

      // The stale answer is not applied; the edited version is asked about itself.
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(2));
      await vi.waitFor(() =>
        expect(store.entityMap()['id-1']?.imageUrl).toBe(
          '/api/links/id-1/image?v=0123456789abcdef',
        ),
      );
      expect(store.entityMap()['id-1']?.updatedAt).toBe('edited');
    });

    it('runs at most three captures at a time', async () => {
      const calls: Subject<LinkResponse>[] = [];
      const { api, store } = setup({ items: [1, 2, 3, 4, 5].map(pendingLink) });
      api.captureImages.mockImplementation(() => {
        const call = new Subject<LinkResponse>();
        calls.push(call);
        return call;
      });

      store.setFilter({ scope: LINKS_SCOPE.All });
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(3));
      expect(calls).toHaveLength(3);

      calls[0].next(link(1));
      calls[0].complete();
      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledTimes(4));
      expect(calls).toHaveLength(4);
    });

    it('asks for a link that became pending through an edit', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.applyEdit(pendingLink(2));

      await vi.waitFor(() => expect(api.captureImages).toHaveBeenCalledWith('id-2'));
    });
  });

  describe('saved and edited links', () => {
    it('shows a saved link at the top of the all scope', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.addSaved(link(9));

      expect(ids(store)[0]).toBe('id-9');
    });

    it('leaves a saved link for the next load when the order is not newest first', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All, sort: 'title', order: 'asc' });

      store.addSaved(link(9));

      expect(ids(store)).not.toContain('id-9');
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

    it('marks a saved link as landed and clears the mark after the motion', () => {
      vi.useFakeTimers();
      try {
        const { store } = setup();
        store.setFilter({ scope: LINKS_SCOPE.All });

        store.addSaved(link(9));
        expect(store.landed()).toEqual({ 'id-9': 0 });

        vi.advanceTimersByTime(3000);
        expect(store.landed()).toEqual({});
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows links saved together at the top in paste order, staggered', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.addSavedMany([link(7), link(8), link(9)]);

      expect(ids(store)).toEqual(['id-7', 'id-8', 'id-9', 'id-1', 'id-2', 'id-3']);
      expect(store.landed()).toEqual({ 'id-7': 0, 'id-8': 1, 'id-9': 2 });
    });

    it('caps the stagger of a long paste', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.addSavedMany(Array.from({ length: 15 }, (_, index) => link(100 + index)));

      expect(store.landed()['id-114']).toBe(10);
    });

    it('leaves links saved together out of a scope they do not belong to', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.Unsorted });

      store.addSavedMany([link(7, { folderId: 'f1' }), link(8, { folderId: null })]);

      expect(ids(store)).toContain('id-8');
      expect(ids(store)).not.toContain('id-7');
      expect(store.landed()).toEqual({ 'id-8': 0 });
    });

    it('starts the capture of links saved together with pending images', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const pending = link(7, {
        title: 'https://example.org/a',
        faviconUrl: '/api/links/id-7/favicon?v=pending',
        imageUrl: '/api/links/id-7/image?v=pending',
      });
      api.captureImages.mockReturnValueOnce(
        of(
          link(7, {
            title: 'The page title',
            faviconUrl: '/api/links/id-7/favicon?v=0123456789abcdef',
            imageUrl: '/api/links/id-7/image?v=0123456789abcdef',
          }),
        ),
      );

      store.addSavedMany([pending]);

      await vi.waitFor(() => expect(store.entityMap()['id-7']?.title).toBe('The page title'));
      expect(store.entityMap()['id-7']?.imageUrl).toBe('/api/links/id-7/image?v=0123456789abcdef');
    });

    it('drops links saved together (Undo) from the feed', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.addSavedMany([link(7), link(8)]);

      store.dropSaved(['id-7', 'id-8']);

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
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

  describe('tag rename and drop', () => {
    const tagged = () => ({
      items: [
        link(1, { tags: ['winter', 'docs'] }),
        link(2, { tags: ['Docs', 'winter'] }),
        link(3),
      ],
    });

    it('renames the tag in the feed and the recent list, ignoring case', async () => {
      const { api, store } = setup(tagged());
      api.recent.mockReturnValue(of({ items: [link(2, { tags: ['Docs', 'winter'] })] }));
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      store.renameTag('WINTER', 'summer');

      expect(store.entityMap()['id-1'].tags).toEqual(['summer', 'docs']);
      expect(store.entityMap()['id-2'].tags).toEqual(['Docs', 'summer']);
      expect(store.recent()[0].tags).toEqual(['Docs', 'summer']);
      expect(store.entityMap()['id-3'].tags).toEqual(MOCK_LINKS[0].tags);
    });

    it('collapses a link that has both tags after a merge', () => {
      const { store } = setup({ items: [link(1, { tags: ['winter', 'clothes', 'Winter'] })] });
      store.setFilter({ scope: LINKS_SCOPE.All });

      store.renameTag('winter', 'clothes');

      expect(store.entityMap()['id-1'].tags).toEqual(['clothes']);
    });

    it('drops the tag from the feed and the recent list', async () => {
      const { api, store } = setup(tagged());
      api.recent.mockReturnValue(of({ items: [link(2, { tags: ['Docs', 'winter'] })] }));
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      store.dropTag('winter');

      expect(store.entityMap()['id-1'].tags).toEqual(['docs']);
      expect(store.recent()[0].tags).toEqual(['Docs']);
    });

    it('keeps Undo from bringing back a link with the old tag name', () => {
      const { store } = setup(tagged());
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      store.renameTag('winter', 'summer');
      store.undoRemove('id-1');

      expect(store.entityMap()['id-1'].tags).toEqual(['summer', 'docs']);
    });

    it('keeps Undo from bringing back a link with a dropped tag', () => {
      const { store } = setup(tagged());
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      store.dropTag('winter');
      store.undoRemove('id-1');

      expect(store.entityMap()['id-1'].tags).toEqual(['docs']);
    });

    it('leaves a delete that is already being sent alone', async () => {
      const { api, store } = setup(tagged());
      const gone = new Subject<void>();
      api.remove.mockReturnValue(gone);
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-1');

      const committing = store.commitRemove('id-1');
      store.renameTag('winter', 'summer');
      gone.error(new Error('down'));
      await committing;

      expect(store.entityMap()['id-1'].tags).toEqual(['winter', 'docs']);
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
