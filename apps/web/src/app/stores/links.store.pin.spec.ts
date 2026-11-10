import { TestBed } from '@angular/core/testing';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksApi } from '../features/links/models/links-api.interface';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import { LinksStore } from './links.store';

function link(id: string, pinnedInFolderAt: string | null = null): LinkResponse {
  return { ...MOCK_LINKS[0], id, folderId: 'f', pinnedInFolderAt };
}

function setup() {
  const api = {
    list: vi.fn<LinksApi['list']>(() =>
      of({ items: [link('b'), link('c')], nextCursor: null, pinned: [link('a', '2026-01-01')] }),
    ),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of({
        ...link(id),
        pinnedInFolderAt: request.pinnedInFolder ? '2026-02-02' : null,
        updatedAt: 'later',
      }),
    ),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
  };
  TestBed.configureTestingModule({ providers: [{ provide: LINKS_API, useValue: api }] });
  const store = TestBed.inject(LinksStore);
  store.setFilter({ scope: LINKS_SCOPE.Folder, folderId: 'f' });
  return { api, store };
}

describe('LinksStore pinned links of a folder', () => {
  it('holds the pinned links of the first page with the others', () => {
    const { store } = setup();

    expect(store.entities().map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(store.entityMap()['a'].pinnedInFolderAt).toBe('2026-01-01');
  });

  it('pins at once and sends the flag', async () => {
    const { store, api } = setup();

    expect(await store.setPinnedInFolder('b', true)).toBe(true);

    expect(api.update).toHaveBeenCalledWith('b', { pinnedInFolder: true });
    expect(store.entityMap()['b'].pinnedInFolderAt).toBe('2026-02-02');
  });

  it('unpins and loads the page again so the link finds its place', async () => {
    const { store, api } = setup();

    expect(await store.setPinnedInFolder('a', false)).toBe(true);

    expect(api.update).toHaveBeenCalledWith('a', { pinnedInFolder: false });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('puts the old state back when the request fails', async () => {
    const { store, api } = setup();
    api.update.mockImplementation(() => throwError(() => new Error('down')));

    expect(await store.setPinnedInFolder('b', true)).toBe(false);

    expect(store.entityMap()['b'].pinnedInFolderAt).toBeNull();
  });

  it('does nothing when the state is already as asked or the link is not loaded', async () => {
    const { store, api } = setup();

    await store.setPinnedInFolder('a', true);
    await store.setPinnedInFolder('zzz', true);

    expect(api.update).not.toHaveBeenCalled();
  });
});
