import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type ListSavedViewsResponse,
  type SavedViewQuery,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { SAVED_VIEWS_API } from '../features/views/models/saved-views-api.const';
import type { SavedViewsApi } from '../features/views/models/saved-views-api.interface';
import { VIEW_OUTCOME } from './models/view-outcome.const';
import { SavedViewsStore } from './saved-views.store';

const QUERY: SavedViewQuery = {
  scope: SAVED_VIEW_SCOPE.All,
  folderId: null,
  tags: [],
  kind: LINK_KIND.Video,
  sort: LINK_SORT_FIELD.CreatedAt,
  order: SORT_ORDER.Desc,
  q: '',
};

function view(id: string, position = 0): SavedViewResponse {
  return { id, name: id, query: QUERY, position, count: 3, available: true };
}

function list(...ids: string[]): ListSavedViewsResponse {
  return { items: ids.map((id, index) => view(id, index)), total: 12 };
}

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

function setup(initial: ListSavedViewsResponse = list('a', 'b', 'c')) {
  const api = {
    list: vi.fn<SavedViewsApi['list']>(() => of(initial)),
    create: vi.fn<SavedViewsApi['create']>((request) =>
      of({ ...view('new', initial.items.length), name: request.name }),
    ),
    update: vi.fn<SavedViewsApi['update']>((id, request) =>
      of({ ...view(id), name: request.name ?? id }),
    ),
    remove: vi.fn<SavedViewsApi['remove']>(() => of(undefined)),
    reorder: vi.fn<SavedViewsApi['reorder']>((ids) => of(list(...ids))),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SAVED_VIEWS_API, useValue: api }] });
  return { api, store: TestBed.inject(SavedViewsStore) };
}

const ids = (store: InstanceType<typeof SavedViewsStore>) => store.items().map((item) => item.id);

describe('SavedViewsStore', () => {
  it('loads once, with the total of the All chip', async () => {
    const { store, api } = setup();
    expect(store.total()).toBeNull();
    await Promise.all([store.load(), store.load()]);
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(ids(store)).toEqual(['a', 'b', 'c']);
    expect(store.total()).toBe(12);
    await store.load();
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('marks a failed first load and can retry; refresh only once loaded', async () => {
    const { store, api } = setup();
    api.list.mockReturnValueOnce(throwError(() => httpError(500)));
    await store.refresh();
    expect(api.list).not.toHaveBeenCalled();
    await store.load();
    expect(store.error()).toBe(true);
    expect(store.loaded()).toBe(false);
    await store.load();
    expect(store.loaded()).toBe(true);
    api.list.mockReturnValueOnce(of({ items: [view('a')], total: 1 }));
    await store.refresh();
    expect(ids(store)).toEqual(['a']);
    expect(store.total()).toBe(1);
  });

  it('a refresh that started before a change keeps the change (only the total is taken)', async () => {
    const { store, api } = setup();
    await store.load();
    const late = new Subject<ListSavedViewsResponse>();
    api.list.mockReturnValueOnce(late);
    const refresh = store.refresh();
    await store.remove('a');
    late.next({ items: list('a', 'b', 'c').items, total: 40 });
    late.complete();
    await refresh;
    expect(ids(store)).toEqual(['b', 'c']);
    expect(store.total()).toBe(40);
  });

  it('creates at the end and maps the refusals', async () => {
    const { store, api } = setup();
    await store.load();
    expect(await store.create('Mine', QUERY)).toBe(VIEW_OUTCOME.Done);
    expect(api.create).toHaveBeenCalledWith({ name: 'Mine', query: QUERY });
    expect(store.items().at(-1)).toMatchObject({ id: 'new', name: 'Mine', position: 3 });

    api.create.mockReturnValueOnce(throwError(() => httpError(HttpStatusCode.Conflict)));
    expect(await store.create('x', QUERY)).toBe(VIEW_OUTCOME.Limit);
    api.create.mockReturnValueOnce(throwError(() => httpError(HttpStatusCode.NotFound)));
    expect(await store.create('x', QUERY)).toBe(VIEW_OUTCOME.Missing);
    api.create.mockReturnValueOnce(throwError(() => httpError(500)));
    expect(await store.create('x', QUERY)).toBe(VIEW_OUTCOME.Failed);
    expect(store.items()).toHaveLength(4);
  });

  it('refuses a create at the limit without a request', async () => {
    const full = list(...Array.from({ length: SAVED_VIEW_LIMIT.PerUserMax }, (_, i) => `v${i}`));
    const { store, api } = setup(full);
    await store.load();
    expect(store.atLimit()).toBe(true);
    expect(await store.create('x', QUERY)).toBe(VIEW_OUTCOME.Limit);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('renames at once and puts the old name back when the request fails', async () => {
    const { store, api } = setup();
    await store.load();
    expect(await store.rename('a', 'a')).toBe(true);
    expect(api.update).not.toHaveBeenCalled();

    const pending = new Subject<SavedViewResponse>();
    api.update.mockReturnValueOnce(pending);
    const done = store.rename('a', 'Renamed');
    expect(store.items()[0]?.name).toBe('Renamed');
    pending.error(httpError(500));
    expect(await done).toBe(false);
    expect(store.items()[0]?.name).toBe('a');

    expect(await store.rename('b', 'Bee')).toBe(true);
    expect(store.items()[1]).toMatchObject({ name: 'Bee', position: 1 });
    expect(await store.rename('missing', 'x')).toBe(true);
  });

  it('deletes at once and puts it back in place when the request fails', async () => {
    const { store, api } = setup();
    await store.load();
    api.remove.mockReturnValueOnce(throwError(() => httpError(500)));
    expect(await store.remove('b')).toBe(false);
    expect(ids(store)).toEqual(['a', 'b', 'c']);
    expect(await store.remove('b')).toBe(true);
    expect(ids(store)).toEqual(['a', 'c']);
    expect(store.items().map((item) => item.position)).toEqual([0, 1]);
    expect(await store.remove('b')).toBe(true);
  });

  it('moves at once, clamps the target and rolls back a failure', async () => {
    const { store, api } = setup();
    await store.load();
    expect(await store.move('c', 0)).toBe(true);
    expect(api.reorder).toHaveBeenCalledWith(['c', 'a', 'b']);
    expect(ids(store)).toEqual(['c', 'a', 'b']);
    expect(await store.move('c', -5)).toBe(true);
    expect(api.reorder).toHaveBeenCalledTimes(1);
    expect(await store.move('x', 1)).toBe(true);

    api.reorder.mockReturnValueOnce(throwError(() => httpError(500)));
    expect(await store.move('c', 9)).toBe(false);
    expect(ids(store)).toEqual(['c', 'a', 'b']);
  });

  it('a failed move under a newer change asks the server instead of undoing it', async () => {
    const { store, api } = setup();
    await store.load();
    const pending = new Subject<ListSavedViewsResponse>();
    api.reorder.mockReturnValueOnce(pending);
    const move = store.move('a', 2);
    await store.remove('b');
    api.list.mockReturnValueOnce(of(list('c', 'a')));
    pending.error(httpError(500));
    expect(await move).toBe(false);
    await Promise.resolve();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('forgets everything when the session ends and drops late answers', async () => {
    const { store, api } = setup();
    await store.load();
    const late = new Subject<SavedViewResponse>();
    api.create.mockReturnValueOnce(late);
    const create = store.create('Late', QUERY);
    TestBed.inject(SessionScope).end();
    late.next(view('late'));
    late.complete();
    await create;
    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.total()).toBeNull();
  });
});
