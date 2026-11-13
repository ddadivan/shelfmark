import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { TestBed } from '@angular/core/testing';
import type { UserSettingsResponse } from '@shelfmark/contracts';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function setup(pauseHistory = false) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory,
    customColours: [],
    customEmoji: [],
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of({ ...settings, pauseHistory: request.pauseHistory ?? settings.pauseHistory }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: api },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
    ],
  });
  return { api, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore pause history', () => {
  // An appearance left in localStorage by another spec would trigger the one-off silent save of it.
  beforeEach(() => localStorage.clear());

  it('is off until the settings say otherwise, then follows the account', async () => {
    const { store } = setup(true);
    expect(store.historyPaused()).toBe(false);

    await store.load();

    expect(store.historyPaused()).toBe(true);
  });

  it('pauses at once and sends the change', async () => {
    const { store, api } = setup(false);
    await store.load();
    const gate = new Subject<UserSettingsResponse>();
    api.update.mockReturnValue(gate);

    const done = store.setPauseHistory(true);
    expect(store.historyPaused()).toBe(true);
    gate.next({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: true,
      customColours: [],
      customEmoji: [],
      ...MOCK_APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
    });
    gate.complete();

    expect(await done).toBe(true);
    expect(api.update).toHaveBeenCalledWith({ pauseHistory: true });
    expect(store.historyPaused()).toBe(true);
  });

  it('puts the old value back when the request fails', async () => {
    const { store, api } = setup(true);
    await store.load();
    api.update.mockImplementation(() => throwError(() => new Error('down')));

    expect(await store.setPauseHistory(false)).toBe(false);

    expect(store.historyPaused()).toBe(true);
  });

  it('sends nothing when the value is already set', async () => {
    const { store, api } = setup(false);
    await store.load();

    expect(await store.setPauseHistory(false)).toBe(true);

    expect(api.update).not.toHaveBeenCalled();
  });

  it('forgets the setting when the session ends', async () => {
    const { store } = setup(true);
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.pauseHistory()).toBeNull();
    expect(store.historyPaused()).toBe(false);
  });
});
