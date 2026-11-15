import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  LINK_ERROR_MESSAGE,
  REMINDER_ERROR_MESSAGE,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { firstValueFrom, type Observable } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockRemindersApi } from './mock-reminders.api';

const HOUR = 3_600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

describe('MockRemindersApi', () => {
  let api: MockRemindersApi;
  let data: MockLibraryData;

  beforeEach(() => {
    vi.useFakeTimers();
    api = TestBed.inject(MockRemindersApi);
    data = TestBed.inject(MockLibraryData);
    data.links = MOCK_LINKS.map((link) => ({ ...link, tags: [...link.tags] }));
  });

  afterEach(() => vi.useRealTimers());

  async function settle<T>(call: Observable<T>): Promise<T> {
    const result = firstValueFrom(call);
    await vi.advanceTimersByTimeAsync(1000);
    return result;
  }

  async function failure(call: Observable<unknown>): Promise<HttpErrorResponse> {
    const result = firstValueFrom(call).then(
      () => null,
      (error: unknown) => error,
    );
    await vi.advanceTimersByTimeAsync(1000);
    const error = await result;
    if (!(error instanceof HttpErrorResponse)) throw new Error('expected an HTTP error');
    return error;
  }

  const [first, second] = MOCK_LINKS as readonly LinkResponse[];

  it('starts with nothing due and lists a set reminder as upcoming', async () => {
    expect(await settle(api.count())).toEqual({ due: 0 });
    const at = inHours(5);
    const link = await settle(api.set(first?.id ?? '', at));
    expect(link.remindAt).toBe(at);
    const list = await settle(api.list());
    expect(list.due).toEqual([]);
    expect(list.upcoming.map((item) => item.id)).toEqual([first?.id]);
  });

  it('counts and lists a reminder whose time has passed as due', async () => {
    data.links = data.links.map((link) => ({ ...link, remindAt: inHours(-1) }));
    expect(await settle(api.count())).toEqual({ due: 2 });
    expect((await settle(api.list())).due).toHaveLength(2);
  });

  it('clears a reminder', async () => {
    await settle(api.set(first?.id ?? '', inHours(2)));
    await settle(api.clear(first?.id ?? ''));
    expect(data.links.find((link) => link.id === first?.id)?.remindAt).toBeNull();
  });

  it('refuses a past time and a missing link like the API', async () => {
    const past = await failure(api.set(first?.id ?? '', inHours(-2)));
    expect(past.status).toBe(400);
    expect(past.error.message).toBe(REMINDER_ERROR_MESSAGE.NotInFuture);
    const missing = await failure(api.set('nope', inHours(2)));
    expect(missing.status).toBe(404);
    expect(missing.error.message).toBe(LINK_ERROR_MESSAGE.NotFound);
    expect((await failure(api.clear('nope'))).status).toBe(404);
  });

  it('sets one reminder on several links, ignoring unknown ids, and validates the batch', async () => {
    const at = inHours(3);
    const result = await settle(
      api.setMany({ ids: [second?.id ?? '', 'nope', first?.id ?? ''], remindAt: at }),
    );
    expect(result.updated).toBe(2);
    expect(result.links.map((link) => link.id)).toEqual([second?.id, first?.id]);
    const cleared = await settle(api.setMany({ ids: [first?.id ?? ''], remindAt: null }));
    expect(cleared.links[0]?.remindAt).toBeNull();
    expect((await failure(api.setMany({ ids: [], remindAt: null }))).status).toBe(400);
    expect((await failure(api.setMany({ ids: ['a', 'a'], remindAt: null }))).status).toBe(400);
    expect((await failure(api.setMany({ ids: ['a'], remindAt: inHours(-1) }))).status).toBe(400);
  });
});
