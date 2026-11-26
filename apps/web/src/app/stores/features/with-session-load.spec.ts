import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { SessionScope } from '../../core/auth/session-scope.service';
import { withSessionLoad } from './with-session-load';

type TestState = { value: string };
const initialState: TestState = { value: 'initial' };

const TestStore = signalStore(
  { providedIn: 'root' },
  withState<TestState>(initialState),
  withSessionLoad<TestState>(initialState),
  withMethods((store) => ({
    set: (value: string) => patchState(store, { value }),
    epoch: () => store._epoch(),
    bump: () => store._bumpVersion(),
    version: () => store._version(),
    nextSeq: () => store._nextSeq(),
    isNewest: (seq: number) => store._isNewest(seq),
    dedupe: (fetch: () => Promise<void>) => store._dedupe(fetch),
    clearFirstLoad: () => store._clearFirstLoad(),
    onSessionEnd: (handler: () => void) => store._onSessionEnd(handler),
  })),
);

describe('withSessionLoad', () => {
  it('runs the session end through SessionScope: epoch, version, sequence and state', () => {
    const store = TestBed.inject(TestStore);
    const epoch = store.epoch();
    const version = store.version();
    const seq = store.nextSeq();
    store.set('mine');
    TestBed.inject(SessionScope).end();
    expect(store.value()).toBe('initial');
    expect(store.epoch()).toBe(epoch + 1);
    expect(store.version()).toBe(version + 1);
    expect(store.isNewest(seq)).toBe(false);
  });

  it('runs extra session-end handlers before the reset', () => {
    const store = TestBed.inject(TestStore);
    const seen: string[] = [];
    store.onSessionEnd(() => seen.push(store.value()));
    store.set('mine');
    TestBed.inject(SessionScope).end();
    expect(seen).toEqual(['mine']);
  });

  it('counts versions and only the newest sequence is newest', () => {
    const store = TestBed.inject(TestStore);
    expect(store.bump()).toBe(store.version());
    const a = store.nextSeq();
    const b = store.nextSeq();
    expect(store.isNewest(a)).toBe(false);
    expect(store.isNewest(b)).toBe(true);
  });

  it('de-duplicates until settled, and clearFirstLoad allows another', async () => {
    const store = TestBed.inject(TestStore);
    const releases: (() => void)[] = [];
    const fetch = vi.fn(() => new Promise<void>((resolve) => releases.push(resolve)));
    const first = store.dedupe(fetch);
    expect(store.dedupe(fetch)).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    store.clearFirstLoad();
    const second = store.dedupe(fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    releases.forEach((release) => release());
    await Promise.all([first, second]);
    await store.dedupe(() => Promise.resolve());
  });
});
