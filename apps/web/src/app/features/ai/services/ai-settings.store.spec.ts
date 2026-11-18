import { TestBed } from '@angular/core/testing';
import {
  ACCOUNT_PLAN,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_PROVIDER_STATUS,
  AI_TIER,
  type AiBackfillStatus,
  type AiSettingsResponse,
} from '@shelfmark/contracts';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { AI_API } from '../models/ai-api.const';
import type { AiApi } from '../models/ai-api.interface';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AiSettingsStore } from './ai-settings.store';

const BACKFILL: AiBackfillStatus = {
  state: AI_BACKFILL_STATE.Idle,
  eligible: 12,
  total: 0,
  done: 0,
  estimatedMinutes: 2,
};

function response(patch: Partial<AiSettingsResponse> = {}): AiSettingsResponse {
  return {
    settings: { ...AI_SETTINGS_DEFAULT },
    introSeen: false,
    entitlements: { plan: ACCOUNT_PLAN.Pro, aiTier: AI_TIER.AiPack },
    usage: {
      linksUsed: 3,
      linksLimit: 1000,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 5000,
    },
    providerStatus: AI_PROVIDER_STATUS.Ok,
    pendingJobs: 0,
    backfill: BACKFILL,
    ...patch,
  };
}

type FakeApi = { [K in keyof AiApi]: ReturnType<typeof vi.fn> };

function setup(initial: AiSettingsResponse = response()) {
  const api: FakeApi = {
    getSettings: vi.fn(() => of(initial)),
    updateSettings: vi.fn(),
    createDraft: vi.fn(),
    getJob: vi.fn(),
    dismissSuggestion: vi.fn(),
    getBackfill: vi.fn(),
    startBackfill: vi.fn(),
    stopBackfill: vi.fn(),
    tick: vi.fn(),
    deleteData: vi.fn(),
    getLinkAi: vi.fn(),
    rewriteSummary: vi.fn(),
    undoApply: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [{ provide: AI_API, useValue: api }] });
  return { api, store: TestBed.inject(AiSettingsStore) };
}

describe('AiSettingsStore', () => {
  it('is off with the defaults until loaded, then follows the account', async () => {
    const { store, api } = setup(
      response({
        settings: { ...AI_SETTINGS_DEFAULT, enabled: true, folderMode: AI_FEATURE_MODE.Auto },
        introSeen: true,
      }),
    );
    expect(store.isOn()).toBe(false);
    expect(store.folderMode()).toBe(AI_FEATURE_MODE.Off);
    expect(store.settings()).toEqual(AI_SETTINGS_DEFAULT);
    await store.load();
    await store.load();
    expect(api.getSettings).toHaveBeenCalledTimes(1);
    expect(store.isOn()).toBe(true);
    expect(store.introSeen()).toBe(true);
    expect(store.folderMode()).toBe(AI_FEATURE_MODE.Auto);
    expect(store.tagsMode()).toBe(AI_FEATURE_MODE.Suggest);
    expect(store.summariesOn()).toBe(true);
    expect(store.resetsOn()).toBe('2026-12-01');
    expect(store.limitReached()).toBe(false);
    expect(store.backfillAvailable()).toBe(true);
    expect(store.backfillRunning()).toBe(false);
  });

  it('reads modes as off while AI is off, the limit, the provider and a Free account', async () => {
    const { store } = setup(
      response({
        settings: { ...AI_SETTINGS_DEFAULT, tagsMode: AI_FEATURE_MODE.Auto },
        usage: {
          linksUsed: 50,
          linksLimit: 50,
          resetsOn: '2026-12-01',
          backfillUsed: 0,
          backfillLimit: 0,
        },
        providerStatus: AI_PROVIDER_STATUS.Unavailable,
      }),
    );
    await store.load();
    expect(store.tagsMode()).toBe(AI_FEATURE_MODE.Off);
    expect(store.summariesOn()).toBe(false);
    expect(store.limitReached()).toBe(true);
    expect(store.providerUnavailable()).toBe(true);
    expect(store.backfillAvailable()).toBe(false);
  });

  it('flags a failed first load and retries on the next call', async () => {
    const { store, api } = setup();
    api.getSettings.mockReturnValueOnce(throwError(() => new Error('down')));
    await store.load();
    expect(store.error()).toBe(true);
    expect(store.loaded()).toBe(false);
    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.error()).toBe(false);
  });

  it('turns AI on at once (intro seen) and takes the server answer', async () => {
    const { store, api } = setup();
    await store.load();
    const answer = new Subject<AiSettingsResponse>();
    api.updateSettings.mockReturnValue(answer);
    const saved = store.update({ enabled: true });
    expect(store.isOn()).toBe(true);
    expect(store.introSeen()).toBe(true);
    expect(api.updateSettings).toHaveBeenCalledWith({ enabled: true });
    answer.next(
      response({
        settings: { ...AI_SETTINGS_DEFAULT, enabled: true },
        introSeen: true,
        pendingJobs: 2,
      }),
    );
    answer.complete();
    expect(await saved).toBe(true);
    expect(store.pendingJobs()).toBe(2);
  });

  it('rolls back only the changed fields when the save fails', async () => {
    const { store, api } = setup(
      response({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true }, introSeen: true }),
    );
    await store.load();
    api.updateSettings.mockReturnValue(throwError(() => new Error('nope')));
    expect(await store.update({ tagsMode: AI_FEATURE_MODE.Off })).toBe(false);
    expect(store.settings().tagsMode).toBe(AI_FEATURE_MODE.Suggest);
    expect(store.isOn()).toBe(true);
  });

  it('puts the intro back when turning on fails', async () => {
    const { store, api } = setup();
    await store.load();
    api.updateSettings.mockReturnValue(throwError(() => new Error('nope')));
    expect(await store.update({ enabled: true })).toBe(false);
    expect(store.isOn()).toBe(false);
    expect(store.introSeen()).toBe(false);
  });

  it('does not let an older answer overwrite a newer change', async () => {
    const { store, api } = setup();
    await store.load();
    const first = new Subject<AiSettingsResponse>();
    api.updateSettings
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(
        of(
          response({ settings: { ...AI_SETTINGS_DEFAULT, summaries: false, includeNotes: true } }),
        ),
      );
    const older = store.update({ summaries: false });
    await store.update({ includeNotes: true });
    first.next(response({ settings: { ...AI_SETTINGS_DEFAULT, summaries: false } }));
    first.complete();
    await older;
    expect(store.settings().includeNotes).toBe(true);
    expect(store.settings().summaries).toBe(false);
  });

  it('refuses a change before the settings are known', async () => {
    const { store, api } = setup();
    expect(await store.update({ enabled: true })).toBe(false);
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('starts, ticks and stops the backfill', async () => {
    const { store, api } = setup();
    await store.load();
    const running: AiBackfillStatus = { ...BACKFILL, state: AI_BACKFILL_STATE.Running, total: 12 };
    api.startBackfill.mockReturnValue(of(running));
    expect(await store.startBackfill()).toBe(true);
    expect(store.backfillRunning()).toBe(true);
    api.tick.mockReturnValue(of({ pendingJobs: 1, backfill: { ...running, done: 6 } }));
    expect(await store.tick()).toEqual({ pendingJobs: 1, backfill: { ...running, done: 6 } });
    expect(store.backfill()?.done).toBe(6);
    expect(store.pendingJobs()).toBe(1);
    api.stopBackfill.mockReturnValue(of({ ...running, state: AI_BACKFILL_STATE.Stopped }));
    expect(await store.stopBackfill()).toBe(true);
    expect(store.backfillRunning()).toBe(false);
    api.startBackfill.mockReturnValue(throwError(() => new Error('409')));
    api.stopBackfill.mockReturnValue(throwError(() => new Error('down')));
    api.tick.mockReturnValue(throwError(() => new Error('down')));
    expect(await store.startBackfill()).toBe(false);
    expect(await store.stopBackfill()).toBe(false);
    expect(await store.tick()).toBeNull();
  });

  it('counts a queued job', async () => {
    const { store } = setup();
    await store.load();
    store.jobQueued();
    expect(store.pendingJobs()).toBe(1);
  });

  it('deletes AI data and reloads the settings', async () => {
    const { store, api } = setup();
    await store.load();
    api.deleteData.mockReturnValue(of(undefined));
    expect(await store.deleteData()).toBe(true);
    expect(api.getSettings).toHaveBeenCalledTimes(2);
    api.deleteData.mockReturnValue(throwError(() => new Error('down')));
    expect(await store.deleteData()).toBe(false);
  });

  it('forgets everything at the session end and drops answers still in flight', async () => {
    const { store, api } = setup();
    const late = new Subject<AiSettingsResponse>();
    api.getSettings.mockReturnValue(late as Observable<AiSettingsResponse>);
    const loading = store.refresh();
    TestBed.inject(SessionScope).end();
    late.next(response({ settings: { ...AI_SETTINGS_DEFAULT, enabled: true } }));
    late.complete();
    await loading;
    expect(store.loaded()).toBe(false);
    expect(store.isOn()).toBe(false);
  });
});
