import { LAYOUT_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
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
import { THEME_STORAGE_KEY } from '../core/theme/models/theme-storage-key.const';
import { ThemeService } from '../core/theme/theme.service';
import { ToastService } from '@shelfmark/ui';
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
    ...LIBRARY_SETTINGS_DEFAULT,
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
    const { store, theme, api } = setup({
      theme: THEME_PREFERENCE.Custom,
      customTheme: DARK,
      motion: MOTION_PREFERENCE.Reduced,
      appearanceSaved: true,
    });
    theme.setPreference(THEME_PREFERENCE.Light);

    await store.load();

    expect(theme.appearance()).toEqual({
      theme: THEME_PREFERENCE.Custom,
      customTheme: DARK,
      motion: MOTION_PREFERENCE.Reduced,
      ...LAYOUT_SETTINGS_DEFAULT,
    });
    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps a theme this browser had while the account never stored one, and saves it once', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, THEME_PREFERENCE.Dark);
    const { store, theme, api } = setup();
    theme.init();

    await store.load();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith({
      theme: THEME_PREFERENCE.Dark,
      customTheme: CUSTOM_THEME_DEFAULT,
      motion: MOTION_PREFERENCE.System,
      ...LAYOUT_SETTINGS_DEFAULT,
    });
  });

  it('saves the local theme silently: a failure keeps it and shows nothing', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, THEME_PREFERENCE.Dark);
    const { store, theme, api } = setup();
    theme.init();
    api.update.mockReturnValueOnce(throwError(() => new Error('down')));
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');

    await store.load();
    await Promise.resolve();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
    expect(show).not.toHaveBeenCalled();
  });

  it('applies the account defaults when neither the account nor the browser has a theme', async () => {
    const { store, theme, api } = setup();

    await store.load();

    expect(theme.appearance()).toEqual({
      theme: THEME_PREFERENCE.System,
      customTheme: CUSTOM_THEME_DEFAULT,
      motion: MOTION_PREFERENCE.System,
      ...LAYOUT_SETTINGS_DEFAULT,
    });
    expect(api.update).not.toHaveBeenCalled();
  });

  it('lets a saved account appearance win over the browser', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, THEME_PREFERENCE.Dark);
    const { store, theme, api } = setup({ theme: THEME_PREFERENCE.Light, appearanceSaved: true });
    theme.init();

    await store.load();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Light);
    expect(api.update).not.toHaveBeenCalled();
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
      ...LIBRARY_SETTINGS_DEFAULT,
      theme: THEME_PREFERENCE.Dark,
      appearanceSaved: true,
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
