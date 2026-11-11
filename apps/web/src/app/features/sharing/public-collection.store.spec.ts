import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  SHARE_LIMIT,
  type PublicCollectionLink,
  type PublicCollectionQuery,
  type PublicCollectionResponse,
} from '@shelfmark/contracts';
import { Subject, of, throwError, type Observable } from 'rxjs';
import { SHARES_API } from './models/shares-api.const';
import { PublicCollectionStore } from './public-collection.store';

const TOKEN = 'sampleToken-sampleToke';

function link(id: number): PublicCollectionLink {
  return {
    id: `l${id}`,
    url: `https://example.com/${id}`,
    title: `Link ${id}`,
    note: null,
    faviconUrl: null,
    imageUrl: null,
  };
}

function page(n: number, hasMore: boolean, count = 2): PublicCollectionResponse {
  return {
    ownerName: 'Ada',
    name: 'Recipes',
    linkCount: 4,
    updatedAt: '2026-11-10T00:00:00.000Z',
    subfolders: [{ id: 'sub', name: 'Baking', linkCount: 1 }],
    items: Array.from({ length: count }, (_, i) => link(n * 100 + i)),
    page: n,
    hasMore,
  };
}

function setup(
  collection: (token: string, query: PublicCollectionQuery) => Observable<PublicCollectionResponse>,
) {
  TestBed.configureTestingModule({
    providers: [PublicCollectionStore, { provide: SHARES_API, useValue: { collection } }],
  });
  return TestBed.inject(PublicCollectionStore);
}

describe('PublicCollectionStore', () => {
  it('loads the first page and appends the next', async () => {
    const calls: PublicCollectionQuery[] = [];
    const store = setup((_token, query) => {
      calls.push(query);
      return of(page(query.page ?? 1, (query.page ?? 1) === 1));
    });

    await store.load(TOKEN);
    expect(store.items()).toHaveLength(2);
    expect(store.hasMore()).toBe(true);

    await store.more();
    expect(store.items().map((item) => item.id)).toEqual(['l100', 'l101', 'l200', 'l201']);
    expect(store.hasMore()).toBe(false);
    await store.more();
    expect(calls).toEqual([{ page: 1 }, { page: 2 }]);
  });

  it('filters by a subfolder and starts over', async () => {
    const calls: PublicCollectionQuery[] = [];
    const store = setup((_token, query) => {
      calls.push(query);
      return of(page(1, false, 1));
    });
    await store.load(TOKEN);
    await store.selectFolder('sub');
    await store.selectFolder('sub');
    expect(store.folder()).toBe('sub');
    expect(calls).toEqual([{ page: 1 }, { page: 1, folder: 'sub' }]);
    await store.selectFolder(null);
    expect(calls.at(-1)).toEqual({ page: 1 });
  });

  it('tells not found from other failures', async () => {
    const missing = setup(() => throwError(() => new HttpErrorResponse({ status: 404 })));
    await missing.load(TOKEN);
    expect(missing.notFound()).toBe(true);
    expect(missing.failed()).toBe(false);

    TestBed.resetTestingModule();
    const broken = setup(() => throwError(() => new HttpErrorResponse({ status: 503 })));
    await broken.load(TOKEN);
    expect(broken.notFound()).toBe(false);
    expect(broken.failed()).toBe(true);
  });

  it('drops an answer that arrives after the filter changed', async () => {
    const slow = new Subject<PublicCollectionResponse>();
    const store = setup((_token, query) =>
      query.folder === undefined ? slow : of(page(1, false, 1)),
    );
    const first = store.load(TOKEN);
    await store.selectFolder('sub');
    slow.next(page(1, false, 2));
    slow.complete();
    await first;
    expect(store.items()).toHaveLength(1);
    expect(store.folder()).toBe('sub');
  });

  it('says when the cap stopped the list', async () => {
    const full = {
      ...page(1, false, 0),
      items: Array.from({ length: SHARE_LIMIT.MaxLinks }, (_, i) => link(i)),
    };
    const store = setup(() => of(full));
    await store.load(TOKEN);
    expect(store.capped()).toBe(true);
  });
});
