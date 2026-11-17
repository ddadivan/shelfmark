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
    list: vi.fn(() => of({ due, upcoming: [] })),
    count: vi.fn(() => of({ due: due.length })),
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

  it('asks only for the count when nothing is due', async () => {
    const { notice, api, show } = await setup([]);
    await notice.check();
    expect(api.count).toHaveBeenCalledOnce();
    expect(api.list).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it('names a newly due link once, with Show opening the Reminders page', async () => {
    const { notice, show, navigate } = await setup([link('Wool coat', 2)]);
    await notice.check();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: TOAST_KIND.Warn,
        title: 'A reminder is due',
        detail: 'Wool coat',
      }),
    );
    show.mock.calls[0]?.[0].action?.run();
    expect(navigate).toHaveBeenCalledWith('/reminders');
    await notice.check();
    expect(show).toHaveBeenCalledOnce();
  });

  it('stays quiet about the ones it already announced and keeps the latest due time', async () => {
    const older = link('a', 5);
    const newer = link('b', 1);
    const { notice, show } = await setup([older, newer]);
    localStorage.setItem(REMINDERS_SEEN_STORAGE_KEY, older.remindAt ?? '');
    await notice.check();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'A reminder is due', detail: 'b' }),
    );
    expect(localStorage.getItem(REMINDERS_SEEN_STORAGE_KEY)).toBe(newer.remindAt);

    // A per-user key: the session end removes it.
    TestBed.inject(SessionScope).end();
    expect(localStorage.getItem(REMINDERS_SEEN_STORAGE_KEY)).toBeNull();
  });

  it('says how many when several became due', async () => {
    const { notice, show } = await setup([link('a', 5), link('b', 1)]);
    await notice.check();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: '2 reminders are due', detail: undefined }),
    );
  });

  it('shows nothing when every due reminder was announced before', async () => {
    const { notice, show } = await setup([link('a', 5)]);
    localStorage.setItem(REMINDERS_SEEN_STORAGE_KEY, new Date().toISOString());
    await notice.check();
    expect(show).not.toHaveBeenCalled();
  });
});
