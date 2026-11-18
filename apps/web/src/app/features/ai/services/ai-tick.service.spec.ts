import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  AI_SEARCH_STATE,
  ASK_PERIOD,
  type AiSearchState,
  type AiSettingsResponse,
} from '@shelfmark/contracts';
import { of } from 'rxjs';
import { AI_API } from '../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AI_TICK_INTERVAL_MS } from '../models/ai-tick-interval.const';
import { AiSettingsStore } from './ai-settings.store';
import { AiTickService } from './ai-tick.service';

function response(
  pendingJobs: number,
  enabled = true,
  search: AiSearchState = AI_SEARCH_STATE.Ready,
): AiSettingsResponse {
  return {
    settings: { ...AI_SETTINGS_DEFAULT, enabled },
    introSeen: true,
    entitlements: { plan: ACCOUNT_PLAN.Free, aiTier: AI_TIER.Free },
    usage: {
      linksUsed: 0,
      linksLimit: 50,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 0,
    },
    providerStatus: AI_PROVIDER_STATUS.Ok,
    pendingJobs,
    backfill: {
      state: AI_BACKFILL_STATE.Idle,
      eligible: 0,
      total: 0,
      done: 0,
      estimatedMinutes: null,
    },
    search: { state: search, ready: 6, total: 10 },
    ask: {
      available: true,
      allowance: { questionsLeft: 12, period: ASK_PERIOD.Day, resetsOn: '2026-11-19' },
    },
  };
}

async function setup(initial: AiSettingsResponse) {
  const tick = vi.fn(() =>
    of({
      pendingJobs: 0,
      backfill: initial.backfill,
      search: { state: AI_SEARCH_STATE.Ready, ready: 10, total: 10 },
    }),
  );
  TestBed.configureTestingModule({
    providers: [{ provide: AI_API, useValue: { getSettings: () => of(initial), tick } }],
  });
  await TestBed.inject(AiSettingsStore).load();
  const service = TestBed.inject(AiTickService);
  TestBed.tick();
  return { service, tick };
}

describe('AiTickService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ticks while jobs are pending and stops once none are left', async () => {
    const { service, tick } = await setup(response(2));
    expect(service.active()).toBe(true);

    await vi.advanceTimersByTimeAsync(AI_TICK_INTERVAL_MS);
    expect(tick).toHaveBeenCalledTimes(1);
    TestBed.tick();
    expect(service.active()).toBe(false);

    await vi.advanceTimersByTimeAsync(AI_TICK_INTERVAL_MS * 3);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('does not tick while AI is off or nothing is pending', async () => {
    const off = await setup(response(2, false));
    expect(off.service.active()).toBe(false);
    TestBed.resetTestingModule();
    const idle = await setup(response(0));
    await vi.advanceTimersByTimeAsync(AI_TICK_INTERVAL_MS * 2);
    expect(idle.tick).not.toHaveBeenCalled();
  });

  it('ticks while links are embedded for search by meaning, until ready', async () => {
    const { service, tick } = await setup(response(0, true, AI_SEARCH_STATE.Processing));
    expect(service.active()).toBe(true);
    await vi.advanceTimersByTimeAsync(AI_TICK_INTERVAL_MS);
    expect(tick).toHaveBeenCalledTimes(1);
    TestBed.tick();
    expect(service.active()).toBe(false);
  });

  it('pauses while the page is hidden', async () => {
    const { service } = await setup(response(1));
    const doc = TestBed.inject(DOCUMENT);
    const state = vi.spyOn(doc, 'visibilityState', 'get').mockReturnValue('hidden');
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(service.active()).toBe(false);
    state.mockReturnValue('visible');
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(service.active()).toBe(true);
  });
});
