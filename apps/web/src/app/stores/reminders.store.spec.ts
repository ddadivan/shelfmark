import { TestBed } from '@angular/core/testing';
import type { LinkResponse, ListRemindersResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { LINKS_API } from '../features/links/models/links-api.const';
import { REMINDERS_API } from '../features/reminders/models/reminders-api.const';
import type { RemindersApi } from '../features/reminders/models/reminders-api.interface';
import { LinksStore } from './links.store';
import { RemindersStore } from './reminders.store';

const HOUR = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();
const link = (id: string, remindAt: string | null): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title: id,
  remindAt,
});

function setup(list: ListRemindersResponse = { due: [link('due', inHours(-2))], upcoming: [] }) {
  const api = {
    list: vi.fn<RemindersApi['list']>(() => of(list)),
    count: vi.fn<RemindersApi['count']>(() => of({ due: list.due.length })),
    set: vi.fn<RemindersApi['set']>((id, remindAt) => of(link(id, remindAt))),
    clear: vi.fn<RemindersApi['clear']>(() => of(undefined)),
    setMany: vi.fn<RemindersApi['setMany']>(({ ids, remindAt }) =>
      of({ updated: ids.length, links: ids.map((id) => link(id, remindAt)) }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: REMINDERS_API, useValue: api },
      { provide: LINKS_API, useValue: { list: vi.fn(() => NEVER) } },
    ],
  });
  const store = TestBed.inject(RemindersStore);
  const patchLinks = vi.spyOn(TestBed.inject(LinksStore), 'patchLinks');
  return { api, store, patchLinks };
}

describe('RemindersStore', () => {
  it('loads the due count for the badge', async () => {
    const { store, api } = setup();
    await store.loadCount();
    expect(api.count).toHaveBeenCalledOnce();
    expect(store.dueCount()).toBe(1);
    expect(store.countLoaded()).toBe(true);
    expect(store.loaded()).toBe(false);
  });

  it('keeps the badge when the count fails', async () => {
    const { store, api } = setup();
    api.count.mockReturnValue(throwError(() => new Error('offline')));
    await store.loadCount();
    expect(store.dueCount()).toBe(0);
    expect(store.countLoaded()).toBe(false);
  });

  it('loads the lists once and shares the first request', async () => {
    const { store, api } = setup({
      due: [link('a', inHours(-1))],
      upcoming: [link('b', inHours(5))],
    });
    await Promise.all([store.load(), store.load()]);
    expect(api.list).toHaveBeenCalledOnce();
    expect(store.due().map((item) => item.id)).toEqual(['a']);
    expect(store.upcoming().map((item) => item.id)).toEqual(['b']);
    expect(store.dueCount()).toBe(1);
    await store.open();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('reports a failed first list and recovers on retry', async () => {
    const { store, api } = setup();
    api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    await store.load();
    expect(store.error()).toBe(true);
    await store.load();
    expect(store.error()).toBe(false);
    expect(store.loaded()).toBe(true);
  });

  it('refresh asks for the count until the lists are loaded, then for the lists', async () => {
    const { store, api } = setup();
    await store.refresh();
    expect(api.count).toHaveBeenCalledOnce();
    expect(api.list).not.toHaveBeenCalled();
    await store.load();
    await store.refresh();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('sets one reminder, moves it into upcoming and patches the feed', async () => {
    const { store, api, patchLinks } = setup({ due: [], upcoming: [] });
    await store.load();
    const at = inHours(24);
    expect(await store.set([link('x', null)], at)).toBe(true);
    expect(api.set).toHaveBeenCalledWith('x', at);
    expect(store.upcoming().map((item) => item.id)).toEqual(['x']);
    expect(patchLinks).toHaveBeenCalledWith([expect.objectContaining({ id: 'x', remindAt: at })]);
  });

  it('Done clears a due reminder and lowers the count, even before the lists load', async () => {
    const { store, api, patchLinks } = setup();
    await store.loadCount();
    const due = link('due', inHours(-2));
    expect(await store.set([due], null)).toBe(true);
    expect(api.clear).toHaveBeenCalledWith('due');
    expect(store.dueCount()).toBe(0);
    expect(patchLinks).toHaveBeenCalledWith([expect.objectContaining({ remindAt: null })]);
  });

  it('snoozes a due link to later: out of due, into upcoming, sorted soonest first', async () => {
    const { store } = setup({
      due: [link('due', inHours(-2))],
      upcoming: [link('soon', inHours(2)), link('later', inHours(48))],
    });
    await store.load();
    await store.set([store.due()[0] as LinkResponse], inHours(24));
    expect(store.due()).toEqual([]);
    expect(store.dueCount()).toBe(0);
    expect(store.upcoming().map((item) => item.id)).toEqual(['soon', 'due', 'later']);
  });

  it('sets several links through the batch', async () => {
    const { store, api } = setup({ due: [], upcoming: [] });
    const at = inHours(3);
    expect(await store.set([link('a', null), link('b', null)], at)).toBe(true);
    expect(api.setMany).toHaveBeenCalledWith({ ids: ['a', 'b'], remindAt: at });
  });

  it('resolves false and changes nothing when the request fails', async () => {
    const { store, api, patchLinks } = setup({ due: [], upcoming: [] });
    api.set.mockReturnValue(throwError(() => new Error('offline')));
    expect(await store.set([link('x', null)], inHours(1))).toBe(false);
    expect(patchLinks).not.toHaveBeenCalled();
    expect(await store.set([], inHours(1))).toBe(true);
  });

  it('forgets everything at the session end and drops an answer in flight', async () => {
    const { store, api } = setup();
    const answer = new Subject<ListRemindersResponse>();
    api.list.mockReturnValue(answer);
    const loading = store.load();
    TestBed.inject(SessionScope).end();
    answer.next({ due: [link('late', inHours(-1))], upcoming: [] });
    answer.complete();
    await loading;
    expect(store.due()).toEqual([]);
    expect(store.loaded()).toBe(false);
  });
});
