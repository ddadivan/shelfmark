import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { aiSettingsResponse, fakeAiApi } from '../../../../testing/fake-ai-api';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import { AI_API } from '../models/ai-api.const';
import { AiSettingsStore } from './ai-settings.store';
import { TidyCountStore } from './tidy-count.store';

async function setup(on = true) {
  const api = fakeAiApi(
    aiSettingsResponse(on ? {} : { settings: { ...AI_SETTINGS_DEFAULT, enabled: false } }),
  );
  api.getTidyCount.mockReturnValue(of({ total: 12 }));
  TestBed.configureTestingModule({ providers: [{ provide: AI_API, useValue: api }] });
  const settings = TestBed.inject(AiSettingsStore);
  await settings.load();
  const store = TestBed.inject(TidyCountStore);
  TestBed.tick();
  return { api, settings, store };
}

describe('TidyCountStore', () => {
  it('reads the count while AI is on and keeps it when a read fails', async () => {
    const { api, store } = await setup();
    expect(store.total()).toBe(0);
    await store.load();
    expect(store.total()).toBe(12);
    api.getTidyCount.mockReturnValue(throwError(() => new Error('down')));
    await store.load();
    expect(store.total()).toBe(12);
  });

  it('asks nothing while AI is off', async () => {
    const { api, store } = await setup(false);
    await store.load();
    expect(store.total()).toBe(0);
    expect(api.getTidyCount).not.toHaveBeenCalled();
  });

  it('reloads when the pending jobs drop to 0, and drops to 0 when AI is turned off', async () => {
    const { api, settings, store } = await setup();
    await store.load();
    settings.jobQueued(2);
    TestBed.tick();
    api.getTidyCount.mockReturnValue(of({ total: 14 }));
    api.tick.mockReturnValue(
      of({
        pendingJobs: 0,
        backfill: aiSettingsResponse().backfill,
        search: aiSettingsResponse().search,
      }),
    );
    await settings.tick();
    TestBed.tick();
    await vi.waitFor(() => expect(store.total()).toBe(14));

    api.updateSettings.mockReturnValue(
      of(aiSettingsResponse({ settings: { ...AI_SETTINGS_DEFAULT, enabled: false } })),
    );
    await settings.update({ enabled: false });
    TestBed.tick();
    expect(store.total()).toBe(0);
  });

  it('forgets the count when the session ends', async () => {
    const { store } = await setup();
    await store.load();
    TestBed.inject(SessionScope).end();
    expect(store.total()).toBe(0);
  });
});
