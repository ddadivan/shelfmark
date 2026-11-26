import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { TestBed } from '@angular/core/testing';
import { AI_BACKFILL_STATE } from '@shelfmark/contracts';
import { of } from 'rxjs';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { provideTranslocoForTest } from '../../../testing/transloco-testing';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { BACKFILL_REMINDER_CONFIRM_MS } from '../models/backfill-reminder-confirm-ms.const';
import { BackfillReminderService } from './backfill-reminder.service';

const IDLE = {
  state: AI_BACKFILL_STATE.Idle,
  eligible: 7,
  total: 0,
  done: 0,
  estimatedMinutes: 1,
};

async function setup() {
  const ai = fakeAiApi(aiSettingsResponse({ backfill: IDLE }));
  ai.startBackfill.mockReturnValue(of({ ...IDLE, state: AI_BACKFILL_STATE.Running, total: 7 }));
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: AI_API, useValue: ai }],
  });
  await TestBed.inject(AiSettingsStore).load();
  return { ai, reminder: TestBed.inject(BackfillReminderService) };
}

describe('BackfillReminderService', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(STORAGE_KEY.BackfillReminderDismissed);
  });

  it('names the links on offer and confirms a start for a moment', async () => {
    const { ai, reminder } = await setup();
    expect(reminder.count()).toBe(7);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    expect(await reminder.process()).toBe(true);
    expect(ai.startBackfill).toHaveBeenCalledTimes(1);
    expect(reminder.count()).toBe(0);
    expect(reminder.shown()).toBe(true);
    expect(await reminder.process()).toBe(false);
    vi.advanceTimersByTime(BACKFILL_REMINDER_CONFIRM_MS);
    expect(reminder.shown()).toBe(false);
  });

  it('remembers Hide on the device and forgets it at the session end', async () => {
    const { reminder } = await setup();
    reminder.dismiss();
    expect(reminder.shown()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY.BackfillReminderDismissed)).toBe('1');
    TestBed.inject(SessionScope).end();
    expect(localStorage.getItem(STORAGE_KEY.BackfillReminderDismissed)).toBeNull();
    // The next account starts with the reminder back (once its settings load).
    await TestBed.inject(AiSettingsStore).load();
    expect(reminder.count()).toBe(7);
  });
});
