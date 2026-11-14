import { TestBed } from '@angular/core/testing';
import { FOLDER_DELETE_MODE, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import type { LinkChange } from './models/link-change.interface';
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

function setup(items: LinkResponse[] = [link(1), link(2), link(3)]) {
  const api = {
    list: vi.fn<LinksApi['list']>(() => of({ items, nextCursor: null, pinned: [] })),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of(link(Number(id.slice(3)), { ...request, updatedAt: 'later' })),
    ),
    remove: vi.fn<LinksApi['remove']>(() => of(undefined)),
  };
  TestBed.configureTestingModule({ providers: [{ provide: LINKS_API, useValue: api }] });
  const store = TestBed.inject(LinksStore);
  const changes: LinkChange[] = [];
  store.linkChanges.subscribe((change) => changes.push(change));
  return { api, store, changes };
}

const ids = (store: InstanceType<typeof LinksStore>) => store.entities().map((item) => item.id);

describe('LinksStore.linkChanges', () => {
  it('publishes a move, its Undo and its rollback, whether or not the link is loaded', async () => {
    const { api, store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.Unsorted });

    await store.move(link(1), 'f');
    expect(changes.at(-1)).toEqual({ upserted: [link(1, { folderId: 'f' })] });
    expect(ids(store)).toEqual(['id-2', 'id-3']);

    await store.move(link(1, { folderId: 'f' }), null);
    expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(changes.at(-1)).toEqual({ upserted: [link(1)] });

    api.update.mockReturnValueOnce(throwError(() => new Error('boom')));
    await store.move(link(2), 'f');
    expect(changes.slice(-2)).toEqual([
      { upserted: [link(2, { folderId: 'f' })] },
      { upserted: [link(2)] },
    ]);
    expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);

    await store.move(link(99), 'f');
    expect(changes.at(-1)).toEqual({ upserted: [link(99, { folderId: 'f' })] });
  });

  it('inserts a link moved into the open folder that the feed never held', async () => {
    const { store } = setup([link(1, { folderId: 'f' })]);
    store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: 'f' });

    await store.move(link(9), 'f');

    expect(ids(store)).toEqual(['id-9', 'id-1']);
  });

  it('inserts a link moved into Unsorted that the feed never held', async () => {
    const { store } = setup();
    store.setFilter({ scope: LINKS_SCOPE.Unsorted });

    await store.move(link(9, { folderId: 'f' }), null);

    expect(ids(store)).toEqual(['id-9', 'id-1', 'id-2', 'id-3']);
  });

  it('does not insert a moved link into the all-links feed', async () => {
    const { store } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });

    await store.move(link(9), 'f');

    expect(ids(store)).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('publishes a bulk change, the server answer and a rollback with the originals', () => {
    const { store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });
    const snapshot = store.snapshot();
    const originals = [link(1), link(2)];

    store.patchLinks(originals.map((item) => ({ ...item, folderId: 'f' })));
    store.restoreSnapshot(snapshot, originals);

    expect(changes).toEqual([
      { upserted: originals.map((item) => ({ ...item, folderId: 'f' })) },
      { upserted: originals },
    ]);
  });

  it('publishes the originals of a rollback even when the view changed meanwhile', () => {
    const { store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });
    const snapshot = store.snapshot();
    store.setFilter({ scope: LINKS_SCOPE.Unsorted });

    store.restoreSnapshot(snapshot, [link(1)]);

    expect(changes).toEqual([{ upserted: [link(1)] }]);
  });

  it('publishes a delete, its Undo and a failed delete', async () => {
    const { api, store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });

    store.remove('id-2');
    expect(changes.at(-1)).toEqual({ removed: ['id-2'] });
    expect(store.isPending('id-2')).toBe(true);

    store.undoRemove('id-2');
    expect(changes.at(-1)).toEqual({ upserted: [link(2)] });
    expect(store.isPending('id-2')).toBe(false);

    api.remove.mockReturnValueOnce(throwError(() => new Error('boom')));
    store.remove('id-3');
    await store.commitRemove('id-3');
    expect(changes.at(-1)).toEqual({ upserted: [link(3)] });
  });

  it('publishes removals of several links, a dropped save and a removal of another tab', () => {
    const { store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });

    store.removeLinks(['id-1', 'id-2']);
    store.dropSaved(['id-7']);
    store.applyRemoval('id-3');

    expect(changes).toEqual([
      { removed: ['id-1', 'id-2'] },
      { removed: ['id-7'] },
      { removed: ['id-3'] },
    ]);
  });

  it('publishes an edit and a favorite toggle with its rollback', async () => {
    const { api, store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });

    store.applyEdit(link(1, { title: 'Edited' }));
    expect(changes.at(-1)).toEqual({ upserted: [link(1, { title: 'Edited' })] });

    await store.toggleFavorite('id-2');
    expect(changes.at(-1)).toEqual({ upserted: [link(2, { isFavorite: true })] });

    api.update.mockReturnValueOnce(throwError(() => new Error('boom')));
    await store.toggleFavorite('id-3');
    expect(changes.slice(-2)).toEqual([
      { upserted: [link(3, { isFavorite: true })] },
      { upserted: [link(3)] },
    ]);
  });

  it('publishes saved links even when they do not show on top', () => {
    const { store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.Favorites });

    store.addSaved(link(8));
    store.addSavedMany([link(9), link(10)]);

    expect(changes).toEqual([{ upserted: [link(8)] }, { upserted: [link(9), link(10)] }]);
  });

  it('publishes a reload for refresh, a folder removal and tag changes', () => {
    const { store, changes } = setup();
    store.setFilter({ scope: LINKS_SCOPE.All });

    store.refresh();
    store.applyFolderRemoval(['f'], FOLDER_DELETE_MODE.MoveToUnsorted);
    store.renameTag('a', 'b');
    store.dropTag('b');

    expect(changes).toEqual([
      { reload: true },
      { reload: true },
      { reload: true },
      { reload: true },
    ]);
  });
});
