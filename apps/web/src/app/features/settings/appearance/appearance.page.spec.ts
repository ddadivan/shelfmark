import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { TestBed } from '@angular/core/testing';
import {
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { CUSTOM_THEME_ATTRIBUTE, THEME_ATTRIBUTE, THEME_CUSTOM, ToastService } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../testing/axe';
import { setupSettingsPage } from '../../../../testing/settings-page-testbed';
import { CUSTOM_THEME_STORAGE_KEY } from '../../../core/theme/models/custom-theme-storage-key.const';
import { MOTION_STORAGE_KEY } from '../../../core/theme/models/motion-storage-key.const';
import { THEME_STORAGE_KEY } from '../../../core/theme/models/theme-storage-key.const';
import { USER_SETTINGS_API } from '../models/user-settings-api.const';
import AppearancePage from './appearance.page';

/** The radio named `label` inside the radiogroup named by the row or label `group`. */
function radioIn(root: HTMLElement, group: string, label: string): HTMLInputElement {
  const groups = Array.from(root.querySelectorAll<HTMLElement>('[role="radiogroup"]'));
  const owner = groups.find((g) => {
    const named = g.getAttribute('aria-label');
    const by = g.getAttribute('aria-labelledby');
    const name = named ?? (by ? root.querySelector(`#${by}`)?.textContent?.trim() : '');
    return name === group;
  });
  const found = Array.from(
    owner?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [],
  ).find(
    (input) =>
      (input.getAttribute('aria-label') ?? input.closest('label')?.textContent?.trim()) === label,
  );
  if (!found) {
    throw new Error(`No radio "${label}" in "${group}"`);
  }
  return found;
}

const BASE: UserSettingsResponse = {
  trashRetentionDays: 30,
  folderColours: true,
  pauseHistory: false,
  ...MOCK_APPEARANCE_DEFAULTS,
  ...LIBRARY_SETTINGS_DEFAULT,
};

async function setup({ fail = false } = {}) {
  let current: UserSettingsResponse = { ...BASE };
  const settingsApi = {
    get: vi.fn(() => of(current)),
    update: vi.fn((request: UpdateUserSettingsRequest) => {
      if (fail) {
        return throwError(() => new Error('down'));
      }
      current = { ...current, ...request };
      return of(current);
    }),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: USER_SETTINGS_API, useValue: settingsApi }],
  });
  const page = await setupSettingsPage(AppearancePage, 'appearance');
  const toasts = TestBed.inject(ToastService);
  const show = vi.spyOn(toasts, 'show');
  const stable = async () => {
    await page.harness.fixture.whenStable();
    page.harness.detectChanges();
  };
  return { ...page, settingsApi, show, stable };
}

describe('AppearancePage', () => {
  const root = document.documentElement;

  afterEach(() => {
    for (const key of [THEME_STORAGE_KEY, CUSTOM_THEME_STORAGE_KEY, MOTION_STORAGE_KEY]) {
      localStorage.removeItem(key);
    }
    for (const name of Object.values(CUSTOM_THEME_ATTRIBUTE)) {
      root.removeAttribute(name);
    }
    root.removeAttribute('data-motion');
  });

  it('shows the theme choice, animations, the preview and the language', async () => {
    const { root: page } = await setup();

    expect(page.querySelector('h1')?.textContent).toContain('Appearance');
    expect(page.textContent).toContain('Saved as you go and synced to all your devices.');
    expect(page.textContent).toContain('Light and Dark are tuned by us');
    expect(page.textContent).toContain('Want other colours or corners? Choose Custom.');
    expect(page.textContent).toContain('Animations');
    expect(page.textContent).toContain('English');
    expect(page.querySelector('ui-theme-preview')?.getAttribute('aria-label')).toBe(
      'Preview of your settings',
    );
    // The custom options appear only for Custom.
    expect(page.textContent).not.toContain('Start from');
    // Not in this issue (#285).
    expect(page.textContent).not.toMatch(/text size|density|font/i);
  });

  it('applies and saves a fixed theme on the account', async () => {
    const { root: page, theme, settingsApi, stable } = await setup();

    expect(radioIn(page, 'Theme', 'System').checked).toBe(true);
    radioIn(page, 'Theme', 'Dark').click();
    await stable();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
    expect(settingsApi.update).toHaveBeenCalledWith({ theme: THEME_PREFERENCE.Dark });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_PREFERENCE.Dark);
    expect(radioIn(page, 'Theme', 'Dark').checked).toBe(true);
  });

  it('picks Custom and changes base, accent, background and corners', async () => {
    const { root: page, theme, settingsApi, stable } = await setup();

    radioIn(page, 'Theme', 'Custom').click();
    await stable();
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_CUSTOM);
    expect(page.textContent).toContain('Start from');
    expect(radioIn(page, 'Background', 'Paper').checked).toBe(true);

    radioIn(page, 'Accent colour', 'Rose').click();
    await stable();
    expect(theme.customTheme().accent).toBe('rose');
    expect(settingsApi.update).toHaveBeenLastCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, accent: 'rose' },
    });
    expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Accent)).toBe('rose');

    radioIn(page, 'Background', 'Mist').click();
    await stable();
    expect(theme.customTheme().background).toBe('mist');

    radioIn(page, 'Corners', 'Square').click();
    await stable();
    expect(theme.customTheme().corners).toBe('square');

    // A base switch takes the first background of the new base.
    radioIn(page, 'Start from', 'Dark').click();
    await stable();
    expect(theme.customTheme()).toEqual({
      base: 'dark',
      accent: 'rose',
      background: 'graphite',
      corners: 'square',
    });
    expect(radioIn(page, 'Background', 'Graphite').checked).toBe(true);
    expect(() => radioIn(page, 'Background', 'Paper')).toThrow();
    expect(root.style.colorScheme).toBe('dark');

    const reset = Array.from(page.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reset custom theme'),
    );
    reset?.click();
    await stable();
    expect(theme.customTheme()).toEqual(CUSTOM_THEME_DEFAULT);
    expect(theme.preference()).toBe(THEME_PREFERENCE.Custom);
  });

  it('sets Animations', async () => {
    const { root: page, theme, settingsApi, stable } = await setup();

    radioIn(page, 'Animations', 'Reduced').click();
    await stable();

    expect(theme.motion()).toBe(MOTION_PREFERENCE.Reduced);
    expect(root.getAttribute('data-motion')).toBe('reduced');
    expect(settingsApi.update).toHaveBeenCalledWith({ motion: MOTION_PREFERENCE.Reduced });
  });

  it('puts the old appearance back and says so when saving fails', async () => {
    const { root: page, theme, show, stable } = await setup({ fail: true });

    radioIn(page, 'Theme', 'Dark').click();
    await stable();

    expect(theme.preference()).toBe(THEME_PREFERENCE.System);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Couldn't save the appearance" }),
    );
  });

  it('ignores values outside the lists', async () => {
    const { harness, settingsApi } = await setup();
    const page = harness.routeDebugElement?.componentInstance as Record<
      string,
      (value: string) => void
    >;
    for (const method of ['setTheme', 'setAccent', 'setBackground', 'setCorners', 'setMotion']) {
      page[method]('nope');
    }
    page['setBase']('light');
    expect(settingsApi.update).not.toHaveBeenCalled();
  });

  it('has no axe violations, with the custom options open too', async () => {
    const { root: page, stable } = await setup();
    expect(await axeViolations(page)).toEqual([]);

    radioIn(page, 'Theme', 'Custom').click();
    await stable();
    expect(await axeViolations(page)).toEqual([]);
  });
});
