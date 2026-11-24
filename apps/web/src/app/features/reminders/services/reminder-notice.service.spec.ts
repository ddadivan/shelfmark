import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { of } from 'rxjs';
import { REMINDERS_SEEN_STORAGE_KEY } from '../../../core/auth/models/reminders-seen-storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { REMINDERS_API } from '../models/reminders-api.const';
import { ReminderNoticeService } from './reminder-notice.service';

const HOUR = 3_600_000;
const link = (id: string, hoursAgo: number): LinkResponse => ({
  ...(MOCK_LINKS[0] as LinkResponse),
  id,
  title: id,
  remindAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
});

async function setup(due: LinkResponse[]) {
  const api = {
    list: vi.fn(() => of({ due, upcoming: [] as LinkResponse[] })),
    count: vi.fn(() => of({ due: due.length })),
    set: vi.fn((linkId: string, remindAt: string) =>
      of({ ...(due.find((item) => item.id === linkId) as LinkResponse), remindAt }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: REMINDERS_API, useValue: api }],
  });
  await loadEnglish();
  const show = vi.spyOn(TestBed.inject(ToastService), 'show').mockReturnValue(undefined as never);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { notice: TestBed.inject(ReminderNoticeService), api, show, navigate };
}

describe('ReminderNoticeService', () => {
  beforeEach(() => localStorage.removeItem(REMINDERS_SEEN_STORAGE_KEY));

  it('says nothing when nothing is due', async () => {
    const { notice, api, show } = await setup([]);
    await notice.check();
    expect(api.count).toHaveBeenCalledOnce();
    expect(show).not.toHaveBeenCalled();
  });

  it('names a newly due link once, with Open and Snooze (Shelf 12-notify)', async () => {
    const { notice, show, api } = await setup([link('Wool coat', 2)]);
    await notice.check();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: TOAST_KIND.Warn,
        title: 'Wool coat is due',
        action: expect.objectContaining({ label: 'Open' }),
        secondary: expect.objectContaining({ label: 'Snooze' }),
      }),
    );
    show.mock.calls[0]?.[0].secondary?.run();
    await vi.waitFor(() => expect(api.set).toHaveBeenCalled());
    const [, remindAt] = api.set.mock.calls[0] ?? [];
    expect(Date.parse(String(remindAt)) - Date.now()).toBeGreaterThan(55 * 60_000);
    await notice.check();
    expect(show).toHaveBeenCalledOnce();
  });

  it('announces an upcoming reminder the moment it is due while the app is open', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const soon = { ...link('Soon', 0), remindAt: new Date(Date.now() + 60_000).toISOString() };
    const { notice, show, api } = await setup([]);
    api.list.mockReturnValueOnce(of({ due: [], upcoming: [soon] }));
    await notice.check();
    expect(show).not.toHaveBeenCalled();
    api.list.mockReturnValue(of({ due: [soon], upcoming: [] }));
    await vi.advanceTimersByTimeAsync(65_000);
    vi.useRealTimers();
    await vi.waitFor(() =>
      expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Soon is due' })),
    );
  });

  it('stays quiet about the ones it already announced and keeps the latest due time', async () => {
    const older = link('a', 5);
    const newer = link('b', 1);
    const { notice, show } = await setup([older, newer]);
    localStorage.setItem(REMINDERS_SEEN_STORAGE_KEY, older.remindAt ?? '');
    await notice.check();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: 'b is due' }));
    expect(localStorage.getItem(REMINDERS_SEEN_STORAGE_KEY)).toBe(newer.remindAt);

    // A per-user key: the session end removes it.
    TestBed.inject(SessionScope).end();
    expect(localStorage.getItem(REMINDERS_SEEN_STORAGE_KEY)).toBeNull();
  });

  it('says how many when several became due', async () => {
    const { notice, show } = await setup([link('a', 5), link('b', 1)]);
    await notice.check();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: '2 reminders are due' }));
  });

  it('shows nothing when every due reminder was announced before', async () => {
    const { notice, show } = await setup([link('a', 5)]);
    localStorage.setItem(REMINDERS_SEEN_STORAGE_KEY, new Date().toISOString());
    await notice.check();
    expect(show).not.toHaveBeenCalled();
  });
});
