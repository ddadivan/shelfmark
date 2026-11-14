import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RECENT_FOLDERS_STORAGE_KEY } from '../core/auth/models/recent-folders-storage-key.const';
import { SessionScope } from '../core/auth/session-scope.service';
import { FoldersStore } from './folders.store';
import { RecentFoldersStore } from './recent-folders.store';

function create(known: readonly string[] = ['a', 'b', 'c']) {
  TestBed.resetTestingModule();
  const entityMap = signal<Record<string, unknown>>(
    Object.fromEntries(known.map((id) => [id, { id }])),
  );
  TestBed.configureTestingModule({
    providers: [{ provide: FoldersStore, useValue: { entityMap } }],
  });
  return { store: TestBed.inject(RecentFoldersStore), entityMap };
}

describe('RecentFoldersStore', () => {
  beforeEach(() => localStorage.removeItem(RECENT_FOLDERS_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(RECENT_FOLDERS_STORAGE_KEY));

  it('records the last targets, most recent first, and keeps them per device', () => {
    const { store } = create();
    store.record('a');
    store.record(null);
    store.record('b');
    store.record('a');

    expect(store.ids()).toEqual(['a', 'b', null]);
    expect(localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY)).toBe('["a","b","unsorted"]');
    expect(create().store.ids()).toEqual(['a', 'b', null]);
  });

  it('leaves folders that no longer exist out of the targets', () => {
    localStorage.setItem(RECENT_FOLDERS_STORAGE_KEY, '["gone","a","unsorted"]');
    const { store, entityMap } = create();

    expect(store.targets()).toEqual(['a', null]);
    entityMap.set({});
    expect(store.targets()).toEqual([null]);
  });

  it('starts empty on corrupt storage and survives blocked storage', () => {
    localStorage.setItem(RECENT_FOLDERS_STORAGE_KEY, '{nope');
    const { store } = create();
    expect(store.ids()).toEqual([]);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => store.record('a')).not.toThrow();
    expect(store.ids()).toEqual(['a']);
    vi.restoreAllMocks();
  });

  it('forgets everything when the session ends', () => {
    const { store } = create();
    store.record('a');

    TestBed.inject(SessionScope).end();

    expect(store.ids()).toEqual([]);
    expect(localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY)).toBeNull();
  });
});
