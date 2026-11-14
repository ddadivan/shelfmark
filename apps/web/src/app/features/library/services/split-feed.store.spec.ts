import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FOLDER_DELETE_MODE,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import { MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import type { SplitTarget } from '../models/split-target.type';
import { SplitFeedStore } from './split-feed.store';
import { SplitViewService } from './split-view.service';

const FOLDER = 'folder-1';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    folderId: FOLDER,
    pinnedInFolderAt: null,
    ...changes,
  };
}

function page(
  items: LinkResponse[],
  nextCursor: string | null = null,
  pinned: LinkResponse[] = [],
): ListLinksResponse {
  return { items, nextCursor, pinned };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

function setup(first: ListLinksResponse = page([link(1), link(2), link(3)])) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of(first)),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of(link(Number(id.slice(3)), { ...request, updatedAt: 'later' })),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
  };
  const rightTarget = signal<SplitTarget>(FOLDER);
  TestBed.configureTestingModule({
    providers: [
      { provide: LINKS_API, useValue: api },
      {
        provide: FOLDERS_API,
        useValue: { list: () => of({ items: [], counts: MOCK_LIBRARY_COUNTS }) },
      },
      { provide: SplitViewService, useValue: { rightTarget } },
      SplitFeedStore,
    ],
  });
  const store = TestBed.inject(SplitFeedStore);
  const links = TestBed.inject(LinksStore);
  return { api, store, links, rightTarget };
}

const ids = (store: InstanceType<typeof SplitFeedStore>) => store.entities().map((item) => item.id);

async function settled(): Promise<void> {
  TestBed.tick();
  await flush();
}

describe('SplitFeedStore', () => {
  it('loads page one of the target folder, the pinned links first', async () => {
    const { api, store } = setup(page([link(2)], null, [link(1, { pinnedInFolderAt: 'x' })]));
    await settled();

    expect(api.list).toHaveBeenCalledWith({ folderId: FOLDER });
    expect(ids(store)).toEqual(['id-1', 'id-2']);
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  it('asks only for unsorted links when the target is Unsorted', async () => {
    const { api, rightTarget } = setup();
    rightTarget.set(null);
    await settled();

    expect(api.list).toHaveBeenCalledWith({ unsorted: true });
  });

  it('loads nothing while there is no target and clears the feed when it goes', async () => {
    const { api, store, rightTarget } = setup();
    rightTarget.set(undefined);
    await settled();
    expect(api.list).not.toHaveBeenCalled();

    rightTarget.set(FOLDER);
    await settled();
    expect(store.count()).toBe(3);

    rightTarget.set(undefined);
    await settled();
    expect(store.count()).toBe(0);
    expect(store.loaded()).toBe(false);
  });

  it('leaves out links in their delete Undo window', async () => {
    const { api, store, links } = setup();
    links.setFilter({ scope: 'all' });
    await settled();
    expect(links.remove('id-2')).toBe(true);
    api.list.mockClear();

    store.show(FOLDER);
    await flush();

    expect(ids(store)).toEqual(['id-1', 'id-3']);
  });

  it('drops a late answer of a previous target and loads the new one', async () => {
    const { api, store, rightTarget } = setup();
    const late = new Subject<ListLinksResponse>();
    api.list.mockReturnValueOnce(late);
    rightTarget.set('folder-2');
    await settled();
    expect(store.loading()).toBe(true);

    rightTarget.set(null);
    api.list.mockReturnValueOnce(of(page([link(7, { folderId: null })])));
    await settled();
    late.next(page([link(99)]));
    await flush();

    expect(ids(store)).toEqual(['id-7']);
  });

  it('reports a failed first load', async () => {
    const { api, store } = setup();
    await settled();
    api.list.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.show('folder-2');
    await flush();

    expect(store.error()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  describe('load more', () => {
    it('appends the next page with the cursor and stops on the last one', async () => {
      const { api, store } = setup(page([link(1), link(2)], 'c1'));
      await settled();
      expect(store.hasMore()).toBe(true);
      api.list.mockReturnValueOnce(of(page([link(3)], null)));

      await store.loadMore();

      expect(api.list).toHaveBeenLastCalledWith({ folderId: FOLDER, cursor: 'c1' });
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(store.hasMore()).toBe(false);
      api.list.mockClear();
      await store.loadMore();
      expect(api.list).not.toHaveBeenCalled();
    });

    it('keeps the button for a retry when it fails', async () => {
      const { api, store } = setup(page([link(1)], 'c1'));
      await settled();
      api.list.mockReturnValueOnce(throwError(() => new Error('boom')));

      await store.loadMore();

      expect(store.loadMoreFailed()).toBe(true);
      expect(store.hasMore()).toBe(true);
    });

    it('drops a late page after the target changed', async () => {
      const { api, store, rightTarget } = setup(page([link(1)], 'c1'));
      await settled();
      const late = new Subject<ListLinksResponse>();
      api.list.mockReturnValueOnce(late);
      const more = store.loadMore();

      rightTarget.set(null);
      api.list.mockReturnValueOnce(of(page([])));
      await settled();
      late.next(page([link(50)], null));
      late.complete();
      await more;

      expect(ids(store)).toEqual([]);
    });
  });

  describe('changes of LinksStore', () => {
    it('inserts a link moved into the target and drops one moved out', async () => {
      const { store, links } = setup();
      await settled();

      await links.move(link(9, { folderId: null }), FOLDER);
      expect(ids(store)).toEqual(['id-9', 'id-1', 'id-2', 'id-3']);

      await links.move(link(2), null);
      expect(ids(store)).toEqual(['id-9', 'id-1', 'id-3']);
    });

    it('puts a link that left back at its slot when it is moved back (Undo)', async () => {
      const { store, links } = setup();
      await settled();

      await links.move(link(2), null);
      await links.move(link(2, { folderId: null }), FOLDER);

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('follows the rollback of a failed move', async () => {
      const { api, store, links } = setup();
      await settled();
      api.update.mockReturnValueOnce(throwError(() => new Error('boom')));

      await links.move(link(2), null);

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('follows a bulk change and its rollback', async () => {
      const { store, links } = setup();
      await settled();
      links.setFilter({ scope: 'all' });
      const snapshot = links.snapshot();

      links.patchLinks([link(1, { folderId: null }), link(3, { folderId: null })]);
      expect(ids(store)).toEqual(['id-2']);

      links.restoreSnapshot(snapshot, [link(1), link(3)]);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('shows an edit in place', async () => {
      const { store, links } = setup();
      await settled();

      links.applyEdit(link(2, { title: 'Edited' }));

      expect(store.entities()[1].title).toBe('Edited');
    });

    it('hides a deleted link and brings it back at its slot on Undo', async () => {
      const { store, links } = setup();
      links.setFilter({ scope: 'folder', folderId: FOLDER });
      await settled();

      links.remove('id-2');
      expect(ids(store)).toEqual(['id-1', 'id-3']);

      links.undoRemove('id-2');
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('takes a saved link into the target and drops it again', async () => {
      const { store, links } = setup();
      await settled();

      links.addSaved(link(8));
      expect(ids(store)[0]).toBe('id-8');

      links.dropSaved(['id-8']);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('loads page one again on a reload and keeps what shows meanwhile', async () => {
      const { api, store, links } = setup();
      await settled();
      const again = new Subject<ListLinksResponse>();
      api.list.mockReturnValueOnce(again);

      links.refresh();
      expect(store.loading()).toBe(true);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);

      again.next(page([link(4)]));
      await flush();
      expect(ids(store)).toEqual(['id-4']);
    });

    it('remembers the slots of several removed ids as they were in the feed', async () => {
      const { store, links } = setup(page([link(1), link(2), link(3), link(4)]));
      await settled();

      links.removeLinks(['id-2', 'id-4']);
      expect(ids(store)).toEqual(['id-1', 'id-3']);
      links.applyEdit(link(4));
      links.patchLinks([link(2), link(4)], true);

      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3', 'id-4']);
    });

    it('ignores an upsert that is no move for a link it never held', async () => {
      const { store, links } = setup(page([link(1)], 'c1'));
      await settled();

      links.applyEdit(link(7, { isFavorite: true }));
      links.patchLinks([link(8, { tags: ['a'] })]);

      expect(ids(store)).toEqual(['id-1']);
    });

    it('keeps the order of links moved in together', async () => {
      const { store, links } = setup();
      await settled();

      links.patchLinks([link(7), link(8), link(9)], true);

      expect(ids(store)).toEqual(['id-7', 'id-8', 'id-9', 'id-1', 'id-2', 'id-3']);
    });

    it('keeps changes that come while page one loads and applies them when it arrives', async () => {
      const first = new Subject<ListLinksResponse>();
      const { api, store, links } = setup();
      api.list.mockReturnValueOnce(first);
      await settled();
      expect(store.loading()).toBe(true);

      await links.move(link(9, { folderId: null }), FOLDER);
      first.next(page([link(1), link(2)]));
      await flush();

      expect(ids(store)).toEqual(['id-9', 'id-1', 'id-2']);
    });

    it('loads page one once more when a reload came meanwhile', async () => {
      const first = new Subject<ListLinksResponse>();
      const { api, store, links } = setup();
      api.list.mockReturnValueOnce(first);
      await settled();

      links.refresh();
      first.next(page([link(1)]));
      await flush();

      expect(api.list).toHaveBeenCalledTimes(2);
      expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('does not ask for a folder that was deleted', async () => {
      const { api, links } = setup();
      await settled();
      await TestBed.inject(FoldersStore).load();
      api.list.mockClear();

      links.applyFolderRemoval([FOLDER], FOLDER_DELETE_MODE.MoveToUnsorted);

      expect(api.list).not.toHaveBeenCalled();
    });

    it('ignores changes while it shows no feed', async () => {
      const { store, links, rightTarget } = setup();
      rightTarget.set(undefined);
      await settled();

      await links.move(link(9, { folderId: null }), FOLDER);

      expect(store.count()).toBe(0);
    });
  });
});
