import { TestBed } from '@angular/core/testing';
import {
  DATE_FORMAT,
  INTERFACE_LANGUAGE,
  LANGUAGE_SETTINGS_DEFAULT,
  LIBRARY_SETTINGS_DEFAULT,
  TIME_FORMAT,
  WEEK_START,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { LocaleService } from '../core/i18n/locale.service';
import { LANGUAGE_STORAGE_KEY } from '../core/i18n/models/language-storage-key.const';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { provideTranslocoForTest } from '../testing/transloco-testing';
import { UserSettingsStore } from './user-settings.store';

function setup(account: Partial<UserSettingsResponse> = {}) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
    ...account,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of({ ...settings, ...request, languageSaved: true }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: USER_SETTINGS_API, useValue: api },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
    ],
  });
  const locale = TestBed.inject(LocaleService);
  return { api, locale, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore language', () => {
  // Nothing from an earlier spec file: a stored appearance or language would be saved once.
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('applies the account language when the settings load (the account wins)', async () => {
    const { store, locale, api } = setup({
      language: INTERFACE_LANGUAGE.De,
      timeFormat: TIME_FORMAT.H12,
      languageSaved: true,
    });
    locale.apply({ ...LANGUAGE_SETTINGS_DEFAULT, language: INTERFACE_LANGUAGE.Fr });

    await store.load();

    expect(locale.settings()).toEqual({
      ...LANGUAGE_SETTINGS_DEFAULT,
      language: INTERFACE_LANGUAGE.De,
      timeFormat: TIME_FORMAT.H12,
    });
    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps a language chosen in this browser while the account never stored one, and saves it once', async () => {
    const local = { ...LANGUAGE_SETTINGS_DEFAULT, language: INTERFACE_LANGUAGE.Es };
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(local));
    const { store, locale, api } = setup();
    await locale.init();

    await store.load();

    expect(locale.settings()).toEqual(local);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(local);
  });

  it('keeps "Match my browser" and writes nothing when neither has a choice', async () => {
    const { store, locale, api } = setup();

    await store.load();

    expect(locale.settings()).toEqual(LANGUAGE_SETTINGS_DEFAULT);
    expect(api.update).not.toHaveBeenCalled();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('changes the language at once and saves only the change', async () => {
    const { store, locale, api } = setup();

    const saved = store.setLanguage({ language: INTERFACE_LANGUAGE.It });
    expect(locale.settings().language).toBe(INTERFACE_LANGUAGE.It);

    await expect(saved).resolves.toBe(true);
    expect(api.update).toHaveBeenCalledWith({ language: INTERFACE_LANGUAGE.It });
  });

  it('does nothing for an unchanged value', async () => {
    const { store, api } = setup();
    await expect(store.setLanguage({ weekStart: WEEK_START.Default })).resolves.toBe(true);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('puts the old settings back when the save fails', async () => {
    const { store, locale, api } = setup();
    api.update.mockReturnValue(throwError(() => new Error('offline')));

    await expect(store.setLanguage({ dateFormat: DATE_FORMAT.Iso })).resolves.toBe(false);

    expect(locale.settings().dateFormat).toBe(DATE_FORMAT.Default);
  });

  it('keeps a later choice when an earlier save fails', async () => {
    const { store, locale, api } = setup();
    const first = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(first);

    const failing = store.setLanguage({ language: INTERFACE_LANGUAGE.Fr });
    await store.setLanguage({ language: INTERFACE_LANGUAGE.Pt });
    first.error(new Error('offline'));

    await expect(failing).resolves.toBe(false);
    expect(locale.settings().language).toBe(INTERFACE_LANGUAGE.Pt);
  });

  it('keeps the language on this device after the session ends', async () => {
    const { store, locale } = setup();
    await store.setLanguage({ language: INTERFACE_LANGUAGE.De });

    TestBed.inject(SessionScope).end();

    expect(locale.settings().language).toBe(INTERFACE_LANGUAGE.De);
  });
});
