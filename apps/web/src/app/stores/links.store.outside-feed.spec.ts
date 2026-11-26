import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { LinksStore } from './links.store';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    isFavorite: false,
    folderId: null,
    ...changes,
  };
}

function page(items: LinkResponse[], nextCursor: string | null = null): ListLinksResponse {
  return { items, nextCursor, pinned: [] };
}

function setup() {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(page([link(1), link(2), link(3)]))),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of(link(Number(id.slice(3)), { ...request, updatedAt: 'later' })),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
  };
  TestBed.configureTestingModule({ providers: [{ provide: LINKS_API, useValue: api }] });
  return { api, store: TestBed.inject(LinksStore) };
}

const ids = (store: InstanceType<typeof LinksStore>) => store.entities().map((item) => item.id);

describe('LinksStore: links outside the open feed and Undo after a feed change', () => {
  describe('Undo of a delete', () => {
    it('does not put the link into another feed that was opened meanwhile', () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');
      api.list.mockReturnValue(of(page([link(7, { isFavorite: true })])));
      store.setFilter({ scope: LINKS_SCOPE.Favorites });

      store.undoRemove('id-2');

      expect(ids(store)).toEqual(['id-7']);
    });

    it('lets a reload bring the link back when it belongs to the new feed', () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2', link(2, { folderId: null }));
      api.list.mockReturnValue(
        of(page([link(1, { folderId: null }), link(2, { folderId: null })])),
      );
      store.setFilter({ scope: LINKS_SCOPE.Unsorted });
      // The new feed is for "Unsorted": the mock links have no folder, so id-2 belongs.
      const calls = api.list.mock.calls.length;

      store.undoRemove('id-2');

      expect(api.list.mock.calls.length).toBe(calls + 1);
      expect(ids(store)).toContain('id-2');
    });

    it('does not duplicate a link that is back in the feed already', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');
      store.undoRemove('id-2');
      store.undoRemove('id-2');

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('a failed delete of a link from another feed does not add it to the open one', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const slow = new Subject<undefined>();
      api.remove.mockReturnValueOnce(slow);
      store.remove('id-2');
      const commit = store.commitRemove('id-2');
      api.list.mockReturnValue(of(page([link(7, { isFavorite: true })])));
      store.setFilter({ scope: LINKS_SCOPE.Favorites });

      slow.error(new Error('down'));

      expect(await commit).toBe(false);
      expect(ids(store)).toEqual(['id-7']);
    });
  });

  describe('delete of a link that is not in the feed', () => {
    it('hides it, commits it to the API and Undo cancels without a request', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const outside = link(9);

      expect(store.remove('id-9', outside)).toBe(true);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(store.isPending('id-9')).toBe(true);
      store.undoRemove('id-9');
      expect(store.isPending('id-9')).toBe(false);
      expect(api.remove).not.toHaveBeenCalled();
      // Undo does not insert a link the feed never held.
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);

      store.remove('id-9', outside);
      expect(await store.commitRemove('id-9')).toBe(true);
      expect(api.remove).toHaveBeenCalledWith('id-9');
    });

    it('takes it out of the recent list', async () => {
      const { api, store } = setup();
      api.recent.mockReturnValue(of({ items: [link(9)] }));
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      expect(store.remove('id-9')).toBe(true);
      expect(store.recent()).toEqual([]);
      store.undoRemove('id-9');
      expect(store.recent().map((item) => item.id)).toEqual(['id-9']);
    });
  });

  describe('favorite of a link that is not in the feed', () => {
    it('stars it from the link the caller shows and sends the request', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const changes: LinkResponse[] = [];
      store.linkChanges.subscribe((change) => changes.push(...(change.upserted ?? [])));

      expect(await store.toggleFavorite('id-9', link(9))).toBe(true);

      expect(api.update).toHaveBeenCalledWith('id-9', { isFavorite: true });
      expect(changes.map((item) => [item.id, item.isFavorite])).toEqual([['id-9', true]]);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('patches the recent list', async () => {
      const { api, store } = setup();
      api.recent.mockReturnValue(of({ items: [link(9)] }));
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();

      await store.toggleFavorite('id-9');

      expect(store.recent()[0]?.isFavorite).toBe(true);
    });

    it('rolls the recent list back and publishes the old link when the request fails', async () => {
      const { api, store } = setup();
      api.recent.mockReturnValue(of({ items: [link(9)] }));
      store.setFilter({ scope: LINKS_SCOPE.All });
      await store.loadRecent();
      api.update.mockReturnValueOnce(throwError(() => new Error('down')));

      expect(await store.toggleFavorite('id-9')).toBe(false);
      expect(store.recent()[0]?.isFavorite).toBe(false);
    });
  });

  describe('setFavorite', () => {
    function favorites() {
      const ctx = setup();
      ctx.api.list.mockReturnValue(
        of(page([link(1, { isFavorite: true }), link(2, { isFavorite: true })])),
      );
      ctx.store.setFilter({ scope: LINKS_SCOPE.Favorites });
      return ctx;
    }

    it('is idempotent: a link that has the value is left alone', async () => {
      const { api, store } = favorites();

      expect(await store.setFavorite('id-1', true)).toBe(true);

      expect(api.update).not.toHaveBeenCalled();
    });

    it('stars a link the feed lost track of (the unstarred slots were cleared) from the captured link', async () => {
      const { api, store } = favorites();
      await store.toggleFavorite('id-1');
      expect(ids(store)).toEqual(['id-2']);
      // A refresh of the same feed forgets where the unstarred link sat.
      api.list.mockReturnValue(of(page([link(2, { isFavorite: true })])));
      store.setFilter({ scope: LINKS_SCOPE.Favorites });
      expect(store.leftByUnstar('id-1')).toBe(false);

      expect(
        await store.setFavorite('id-1', true, link(1, { isFavorite: false }), { rejoin: true }),
      ).toBe(true);

      expect(api.update).toHaveBeenLastCalledWith('id-1', { isFavorite: true });
      expect(ids(store)).toEqual(['id-1', 'id-2']);
      expect(store.entityMap()['id-1']?.isFavorite).toBe(true);
    });

    it('puts the link back at its old slot when the slot is still known', async () => {
      const { store } = favorites();
      await store.toggleFavorite('id-1');

      await store.setFavorite('id-1', true, link(1), { rejoin: true });

      expect(ids(store)).toEqual(['id-1', 'id-2']);
    });

    it('does not flip back: unstarring a link that is already unstarred sends nothing', async () => {
      const { api, store } = favorites();
      await store.toggleFavorite('id-1');
      api.update.mockClear();

      expect(await store.setFavorite('id-1', false)).toBe(true);

      expect(api.update).not.toHaveBeenCalled();
      expect(ids(store)).toEqual(['id-2']);
    });

    it('waits for a request still running instead of reporting success', async () => {
      const { api, store } = favorites();
      const slow = new Subject<LinkResponse>();
      api.update.mockReturnValueOnce(slow);
      const unstar = store.toggleFavorite('id-1');

      const star = store.setFavorite('id-1', true, link(1), { rejoin: true });
      let finished = false;
      void star.then(() => (finished = true));
      await Promise.resolve();
      expect(finished).toBe(false);

      slow.next(link(1, { updatedAt: 'later' }));
      slow.complete();
      await unstar;

      expect(await star).toBe(true);
      expect(api.update).toHaveBeenLastCalledWith('id-1', { isFavorite: true });
      expect(ids(store)).toEqual(['id-1', 'id-2']);
    });

    it('removes a rejoined link again when the request fails', async () => {
      const { api, store } = favorites();
      await store.toggleFavorite('id-1');
      api.update.mockReturnValueOnce(throwError(() => new Error('down')));

      expect(await store.setFavorite('id-1', true, link(1), { rejoin: true })).toBe(false);

      expect(ids(store)).toEqual(['id-2']);
      expect(store.leftByUnstar('id-1')).toBe(true);
    });
  });

  describe('move of a link in its delete Undo window', () => {
    it('says it could not move instead of reporting a success', async () => {
      const { api, store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      store.remove('id-2');

      expect(await store.move(link(2), 'folder-x')).toBe(false);
      expect(api.update).not.toHaveBeenCalled();
    });
  });

  describe('rollback of a bulk change', () => {
    it('keeps pages loaded after the snapshot and puts removed links back at their slot', async () => {
      const { api, store } = setup();
      api.list.mockReturnValueOnce(of(page([link(1), link(2), link(3)], 'next')));
      store.setFilter({ scope: LINKS_SCOPE.All });
      const snapshot = store.snapshot();
      store.removeLinks(['id-2']);
      api.list.mockReturnValueOnce(of(page([link(4), link(5)])));
      await store.loadMore();
      expect(ids(store)).toEqual(['id-1', 'id-3', 'id-4', 'id-5']);

      store.restoreSnapshot(snapshot, [link(2)]);

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3', 'id-4', 'id-5']);
    });

    it('restores only the given links and leaves other changes alone', async () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const snapshot = store.snapshot();
      store.patchLinks([link(1, { title: 'Bulk' }), link(2, { title: 'Bulk' })]);
      store.applyEdit(link(3, { title: 'Edited meanwhile' }));

      store.restoreSnapshot(snapshot, [link(1), link(2)]);

      expect(store.entities().map((item) => item.title)).toEqual([
        'Link 1',
        'Link 2',
        'Edited meanwhile',
      ]);
    });

    it('does nothing in this feed after a sign-out', () => {
      const { store } = setup();
      store.setFilter({ scope: LINKS_SCOPE.All });
      const snapshot = store.snapshot();
      store.reset();

      store.restoreSnapshot(snapshot, [link(1)]);

      expect(ids(store)).toEqual([]);
    });
  });
});
