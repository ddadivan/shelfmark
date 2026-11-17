import { LIBRARY_SETTINGS_DEFAULT, type UserSettingsResponse } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function setup(whatsNewSeen: string | null) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    customColours: [],
    customEmoji: [],
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
    whatsNewSeen,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) => of({ ...settings, ...request })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: api },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
    ],
  });
  return { api, store: TestBed.inject(UserSettingsStore) };
}

describe("UserSettingsStore what's new (#424)", () => {
  beforeEach(() => localStorage.clear());

  it('is unknown until the settings answer, then follows the account', async () => {
    const { store } = setup('2.0.0');
    expect(store.whatsNewKnown()).toBe(false);

    await store.load();

    expect(store.whatsNewKnown()).toBe(true);
    expect(store.whatsNewSeen()).toBe('2.0.0');
  });

  it('marks a release seen at once and saves only that field', async () => {
    const { store, api } = setup(null);
    await store.load();

    expect(await store.setWhatsNewSeen('2.0.5')).toBe(true);

    expect(store.whatsNewSeen()).toBe('2.0.5');
    expect(api.update).toHaveBeenCalledWith({ whatsNewSeen: '2.0.5' });
    expect(await store.setWhatsNewSeen('2.0.5')).toBe(true);
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('keeps it seen for this load when the save fails', async () => {
    const { store, api } = setup('2.0.0');
    await store.load();
    api.update.mockReturnValue(throwError(() => new Error('offline')));

    expect(await store.setWhatsNewSeen('2.0.5')).toBe(false);

    expect(store.whatsNewSeen()).toBe('2.0.5');
  });

  it('forgets it when the session ends', async () => {
    const { store } = setup('2.0.0');
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.whatsNewKnown()).toBe(false);
    expect(store.whatsNewSeen()).toBeNull();
  });
});
