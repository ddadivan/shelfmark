import { TestBed } from '@angular/core/testing';
import type { AskConversationSummary } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { ASK_HISTORY_API } from '../models/ask-history-api.const';
import { AskHistoryChanges } from './ask-history-changes.service';
import { AskHistoryStore } from './ask-history.store';

const today = new Date().toISOString();
const old = '2026-01-02T10:00:00.000Z';
const row = (id: string, updatedAt: string): AskConversationSummary => ({
  id,
  title: `Question ${id}`,
  turns: 1,
  createdAt: updatedAt,
  updatedAt,
});

function setup() {
  const api = {
    list: vi.fn((cursor?: string) =>
      of(
        cursor === undefined
          ? { items: [row('a', today), row('b', old)], nextCursor: 'b' }
          : { items: [row('c', old)], nextCursor: null },
      ),
    ),
    get: vi.fn(),
    remove: vi.fn(() => of(undefined)),
    clear: vi.fn(() => of({ deleted: 3 })),
  };
  TestBed.configureTestingModule({ providers: [{ provide: ASK_HISTORY_API, useValue: api }] });
  return { api, store: TestBed.inject(AskHistoryStore) };
}

describe('AskHistoryStore', () => {
  it('reads the first page, groups Today and Earlier and pages on', async () => {
    const { api, store } = setup();
    await store.load();
    expect(store.groups().map((group) => [group.labelKey, group.items.map((i) => i.id)])).toEqual([
      ['ai.ask.history.today', ['a']],
      ['ai.ask.history.earlier', ['b']],
    ]);
    await store.loadMore();
    expect(api.list).toHaveBeenLastCalledWith('b');
    expect(store.items().map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(store.nextCursor()).toBeNull();
    await store.loadMore();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('marks a failed read and recovers on Try again', async () => {
    const { api, store } = setup();
    api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    await store.load();
    expect(store.failed()).toBe(true);
    expect(store.loaded()).toBe(true);
    await store.load();
    expect(store.failed()).toBe(false);
    expect(store.items()).toHaveLength(2);
  });

  it('removes one conversation and clears all, keeping the list on a failure', async () => {
    const { api, store } = setup();
    await store.load();
    api.remove.mockReturnValueOnce(throwError(() => new Error('500')));
    expect(await store.remove('a')).toBe(false);
    expect(store.items()).toHaveLength(2);
    expect(await store.remove('a')).toBe(true);
    expect(store.items().map((item) => item.id)).toEqual(['b']);
    expect(await store.clear()).toBe(true);
    expect(store.items()).toEqual([]);
  });

  it('reads again when a turn was stored, once the list was shown', async () => {
    const { api, store } = setup();
    const changes = TestBed.inject(AskHistoryChanges);
    changes.notify();
    TestBed.tick();
    expect(api.list).not.toHaveBeenCalled();
    await store.load();
    changes.notify();
    TestBed.tick();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('forgets the list when the session ends', async () => {
    const { store } = setup();
    await store.load();
    TestBed.inject(SessionScope).end();
    expect(store.items()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });
});
