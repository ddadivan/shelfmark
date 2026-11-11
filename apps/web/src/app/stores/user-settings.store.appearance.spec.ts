import { TestBed } from '@angular/core/testing';
import {
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  type CustomTheme,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { ThemeService } from '../core/theme/theme.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

const DARK: CustomTheme = { base: 'dark', accent: 'teal', background: 'forest', corners: 'round' };

function setup(account: Partial<UserSettingsResponse> = {}) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...account,
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
  const theme = TestBed.inject(ThemeService);
  return { api, theme, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore appearance', () => {
  afterEach(() => localStorage.clear());

  it('applies the account appearance when the settings load (the account wins)', async () => {
    const { store, theme } = setup({
      theme: THEME_PREFERENCE.Custom,
      customTheme: DARK,
      motion: MOTION_PREFERENCE.Reduced,
    });
    theme.setPreference(THEME_PREFERENCE.Light);

    await store.load();

    expect(theme.appearance()).toEqual({
      theme: THEME_PREFERENCE.Custom,
      customTheme: DARK,
      motion: MOTION_PREFERENCE.Reduced,
    });
  });

  it('does not let a slower first load undo a change made meanwhile', async () => {
    const { store, theme, api } = setup({ theme: THEME_PREFERENCE.Dark });
    const gate = new Subject<UserSettingsResponse>();
    api.get.mockReturnValueOnce(gate);
    const loading = store.load();

    await store.setAppearance({ theme: THEME_PREFERENCE.Light });
    gate.next({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
      theme: THEME_PREFERENCE.Dark,
    });
    gate.complete();
    await loading;

    expect(theme.preference()).toBe(THEME_PREFERENCE.Light);
  });

  it('applies a change at once and sends only that change', async () => {
    const { store, theme, api } = setup();

    const saving = store.setAppearance({ customTheme: DARK, theme: THEME_PREFERENCE.Custom });
    expect(theme.preference()).toBe(THEME_PREFERENCE.Custom);
    expect(await saving).toBe(true);

    expect(api.update).toHaveBeenCalledWith({ customTheme: DARK, theme: THEME_PREFERENCE.Custom });
    expect(theme.customTheme()).toEqual(DARK);
  });

  it('sends nothing when nothing changes', async () => {
    const { store, api } = setup();
    expect(await store.setAppearance({ customTheme: { ...CUSTOM_THEME_DEFAULT } })).toBe(true);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('puts the old appearance back when the request fails', async () => {
    const { store, theme, api } = setup();
    api.update.mockReturnValueOnce(throwError(() => new Error('down')));

    expect(await store.setAppearance({ motion: MOTION_PREFERENCE.Reduced })).toBe(false);

    expect(theme.motion()).toBe(MOTION_PREFERENCE.System);
  });

  it('keeps a later choice when an earlier request fails or answers late', async () => {
    const { store, theme, api } = setup();
    const first = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(first);

    const failing = store.setAppearance({ theme: THEME_PREFERENCE.Dark });
    await store.setAppearance({ theme: THEME_PREFERENCE.Light });
    first.error(new Error('down'));

    expect(await failing).toBe(false);
    expect(theme.preference()).toBe(THEME_PREFERENCE.Light);
  });

  it('ignores answers that arrive after the session ended', async () => {
    const { store, theme, api } = setup();
    const gate = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(gate);

    const saving = store.setAppearance({ theme: THEME_PREFERENCE.Dark });
    TestBed.inject(SessionScope).end();
    gate.error(new Error('down'));

    expect(await saving).toBe(false);
    // The session end keeps what this browser shows; the failed save is not rolled back into it.
    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
  });
});
