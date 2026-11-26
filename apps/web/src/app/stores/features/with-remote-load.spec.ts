import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { SessionScope } from '../../core/auth/session-scope.service';
import type { RemoteLoadState } from './models/remote-load-state.type';
import { withRemoteLoad } from './with-remote-load';

type TestState = RemoteLoadState & { items: readonly string[] };

const initialState: TestState = { items: [], loaded: false, loading: false, error: false };

/** A read the test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Every read the store made, in order; emptied before each test. */
const reads: ReturnType<typeof deferred<string[]>>[] = [];

const TestStore = signalStore(
  { providedIn: 'root' },
  withState<TestState>(initialState),
  withRemoteLoad(initialState),
  withMethods((store) => {
    const read = (): Promise<string[]> => {
      const request = deferred<string[]>();
      reads.push(request);
      return request.promise;
    };
    const apply = (items: string[]): void =>
      patchState(store, { items, loaded: true, loading: false, error: false });
    return {
      load: () => store._ensureLoaded(read, apply),
      refresh: () => store._fetchAll(read, apply),
      begin: () => store._begin(),
      finish: (token: number) => store._finish(token),
      isCurrent: (token: number) => store._isCurrent(token),
    };
  }),
);

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('withRemoteLoad', () => {
  beforeEach(() => {
    reads.length = 0;
  });

  function setup() {
    return { store: TestBed.inject(TestStore), scope: TestBed.inject(SessionScope) };
  }

  it('shares the first load between callers and reads once', async () => {
    const { store } = setup();
    const a = store.load();
    const b = store.load();
    expect(reads).toHaveLength(1);
    expect(store.loading()).toBe(true);
    reads[0].resolve(['x']);
    await Promise.all([a, b]);
    expect(store.items()).toEqual(['x']);
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
    await store.load();
    expect(reads).toHaveLength(1);
  });

  it('lets a failed first load be retried and flags the error', async () => {
    const { store } = setup();
    const first = store.load();
    reads[0].reject(new Error('down'));
    await first;
    expect(store.error()).toBe(true);
    expect(store.loading()).toBe(false);
    const retry = store.load();
    expect(reads).toHaveLength(2);
    reads[1].resolve(['y']);
    await retry;
    expect(store.items()).toEqual(['y']);
    expect(store.error()).toBe(false);
  });

  it('keeps the list after a failed refresh', async () => {
    const { store } = setup();
    const first = store.load();
    reads[0].resolve(['x']);
    await first;
    const refresh = store.refresh();
    reads[1].reject(new Error('down'));
    await refresh;
    expect(store.items()).toEqual(['x']);
    expect(store.error()).toBe(false);
  });

  it('drops the answer of an older request when a newer one was made', async () => {
    const { store } = setup();
    const first = store.load();
    const second = store.refresh();
    reads[1].resolve(['new']);
    await second;
    reads[0].resolve(['old']);
    await first;
    expect(store.items()).toEqual(['new']);
  });

  it('drops a list that started before a mutation and asks again at once when none runs', async () => {
    const { store } = setup();
    const load = store.load();
    const token = store.begin();
    store.finish(token); // mutation done before the list arrives: version moved
    reads[0].resolve(['stale']);
    await tick();
    expect(store.items()).toEqual([]);
    expect(reads).toHaveLength(2);
    reads[1].resolve(['fresh']);
    await load;
    await tick();
    expect(store.items()).toEqual(['fresh']);
  });

  it('refetches once when the last running mutation finishes', async () => {
    const { store } = setup();
    void store.load();
    const a = store.begin();
    const b = store.begin();
    reads[0].resolve(['stale']);
    await tick();
    expect(store.items()).toEqual([]);
    expect(reads).toHaveLength(1);
    store.finish(a);
    expect(reads).toHaveLength(1);
    store.finish(b);
    expect(reads).toHaveLength(2);
    reads[1].resolve(['fresh']);
    await tick();
    expect(store.items()).toEqual(['fresh']);
  });

  it('does not refetch after a mutation when nothing was dropped', async () => {
    const { store } = setup();
    const token = store.begin();
    store.finish(token);
    expect(reads).toHaveLength(0);
  });

  it('forgets the user at the session end: state reset, in-flight answers dropped', async () => {
    const { store, scope } = setup();
    const first = store.load();
    reads[0].resolve(['mine']);
    await first;
    const token = store.begin();
    const pending = store.refresh();
    scope.end();
    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.isCurrent(token)).toBe(false);
    reads[1].resolve(['previous user']);
    await pending;
    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
    // The token of the old session no longer counts, and a new load starts clean.
    store.finish(token);
    const next = store.load();
    expect(reads).toHaveLength(3);
    reads[2].resolve(['next user']);
    await next;
    expect(store.items()).toEqual(['next user']);
  });

  it('starts a new first load after the session end even if the old one is still running', async () => {
    const { store, scope } = setup();
    const old = store.load();
    scope.end();
    const fresh = store.load();
    expect(reads).toHaveLength(2);
    reads[0].resolve(['old']);
    await old;
    // The old request finishing must not release the new one's de-dup.
    const again = store.load();
    expect(reads).toHaveLength(2);
    reads[1].resolve(['new']);
    await Promise.all([fresh, again]);
    expect(store.items()).toEqual(['new']);
  });
});
