import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiColorPickerHarness } from '@shelfmark/ui/testing';
import {
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  THEME_PREFERENCE,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import {
  CUSTOM_ACCENT_OWN,
  CUSTOM_THEME_ATTRIBUTE,
  TOAST_KIND,
  LAYOUT_ATTRIBUTE,
  LAYOUT_OFF,
  THEME_ATTRIBUTE,
  THEME_CUSTOM,
  ToastService,
  nearestAccessibleAccent,
  nearestReadableBackground,
} from '@shelfmark/ui';
import { LAYOUT_STORAGE_KEY } from '../../../../core/theme/models/layout-storage-key.const';
import { of, throwError } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { CUSTOM_THEME_STORAGE_KEY } from '../../../../core/theme/models/custom-theme-storage-key.const';
import { MOTION_STORAGE_KEY } from '../../../../core/theme/models/motion-storage-key.const';
import { THEME_STORAGE_KEY } from '../../../../core/theme/models/theme-storage-key.const';
import { USER_SETTINGS_API } from '../../models/user-settings-api.const';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
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

/** The own-colour picker whose swatch button is named `label`. */
async function pickerNamed(
  harness: { fixture: ComponentFixture<unknown> },
  label: string,
): Promise<UiColorPickerHarness> {
  return TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
    UiColorPickerHarness.with({ label }),
  );
}

const BASE: UserSettingsResponse = {
  trashRetentionDays: 30,
  folderColours: true,
  pauseHistory: false,
  customColours: [],
  customEmoji: [],
  ...MOCK_APPEARANCE_DEFAULTS,
  ...LIBRARY_SETTINGS_DEFAULT,
};

async function setup({
  fail = false,
  settings = {},
}: { fail?: boolean; settings?: Partial<UserSettingsResponse> } = {}) {
  let current: UserSettingsResponse = { ...BASE, ...settings };
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
    for (const key of [
      THEME_STORAGE_KEY,
      CUSTOM_THEME_STORAGE_KEY,
      MOTION_STORAGE_KEY,
      LAYOUT_STORAGE_KEY,
    ]) {
      localStorage.removeItem(key);
    }
    for (const name of Object.values(CUSTOM_THEME_ATTRIBUTE)) {
      root.removeAttribute(name);
    }
    root.removeAttribute('data-motion');
    for (const name of ['--accent', '--accent-bg', '--accent-text', '--focus-ring']) {
      root.style.removeProperty(name);
    }
    for (const name of Object.values(LAYOUT_ATTRIBUTE)) {
      root.removeAttribute(name);
    }
  });

  it('shows the theme choice, animations and the preview, without the moved rows (#315)', async () => {
    const { root: page } = await setup();

    expect(page.querySelector('h1')?.textContent).toContain('Appearance');
    expect(page.textContent).toContain('Saved as you go and synced to all your devices.');
    expect(page.textContent).toContain('Light and Dark are tuned by us');
    expect(page.textContent).toContain('Want other colors or corners? Choose Custom.');
    expect(page.textContent).toContain('Animations');
    // Language has its own page, link counts live in Library, recently opened in Privacy.
    expect(page.querySelector('a[href="/settings/language"]')).toBeNull();
    for (const gone of ['Change language', 'Link counts', 'Remember recently opened']) {
      expect(page.textContent).not.toContain(gone);
    }
    expect(page.querySelector('ui-theme-preview')?.getAttribute('aria-label')).toBe(
      'Preview of your settings',
    );
    // The custom options appear only for Custom.
    expect(page.textContent).not.toContain('Start from');
    // The extras of #285.
    for (const title of ['Text and layout', 'Cards', 'Sidebar and motion']) {
      expect(page.textContent).toContain(title);
    }
  });

  it('draws the link counts and Recently opened in the preview as Library and Privacy set them (#315)', async () => {
    const shown = await setup();
    const preview = () => shown.root.querySelector('ui-theme-preview') as HTMLElement;
    await vi.waitFor(() => {
      shown.harness.detectChanges();
      expect(preview().querySelectorAll('.ui-theme-preview__count').length).toBeGreaterThan(0);
      expect(preview().textContent).toContain('Recently opened');
    });
  });

  it('leaves the counts and Recently opened out of the preview when they are off (#315)', async () => {
    const off = await setup({ settings: { showFolderCounts: false, pauseHistory: true } });
    await TestBed.inject(UserSettingsStore).load();
    await vi.waitFor(() => {
      off.harness.detectChanges();
      const preview = off.root.querySelector('ui-theme-preview') as HTMLElement;
      expect(preview.querySelectorAll('.ui-theme-preview__count')).toHaveLength(0);
      expect(preview.textContent).not.toContain('Recently opened');
    });
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

    radioIn(page, 'Accent color', 'Rose').click();
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

  it('saves an own accent color that keeps 4.5:1 from the "+" swatch (#315)', async () => {
    const { root: page, theme, settingsApi, stable, harness } = await setup();
    radioIn(page, 'Theme', 'Custom').click();
    await stable();

    const picker = await pickerNamed(harness, 'Your own color');
    await picker.open();
    await picker.setHex('#23716C');
    // Typing only previews; "Add color" is the explicit choice (#350).
    await picker.add();
    await stable();

    expect(theme.customTheme().accent).toBe('#23716c');
    expect(settingsApi.update).toHaveBeenLastCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, accent: '#23716c' },
    });
    expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Accent)).toBe(CUSTOM_ACCENT_OWN);
    expect(root.style.getPropertyValue('--accent')).toBe('#23716c');
    // No curated swatch is checked; the own color is a swatch of its own and is checked (#335).
    expect(radioIn(page, 'Accent color', 'Ocean').checked).toBe(false);
    expect(radioIn(page, 'Accent color', '#23716c').checked).toBe(true);
    expect(page.querySelector('ui-notice')).toBeNull();

    // A curated accent takes over again and drops the custom properties.
    radioIn(page, 'Accent color', 'Teal').click();
    await stable();
    expect(theme.customTheme().accent).toBe('teal');
    expect(root.style.getPropertyValue('--accent')).toBe('');
  });

  it('warns about an own color below 4.5:1 and offers the nearest passing shade', async () => {
    const { root: page, theme, settingsApi, stable, harness } = await setup();
    radioIn(page, 'Theme', 'Custom').click();
    await stable();
    settingsApi.update.mockClear();

    const picker = await pickerNamed(harness, 'Your own color');
    await picker.open();
    await picker.setHex('#f5d0e0');
    // Typing only previews; "Add color" is the explicit choice (#350).
    await picker.add();
    await stable();

    // Not applied: the accent stays and nothing is saved.
    expect(theme.customTheme().accent).toBe(CUSTOM_THEME_DEFAULT.accent);
    expect(settingsApi.update).not.toHaveBeenCalled();
    const notice = page.querySelector('ui-notice');
    expect(notice?.textContent).toMatch(
      /hard to read on your background \(1\.\d:1, it needs 4\.5:1\)/u,
    );
    const shade = nearestAccessibleAccent('#f5d0e0', 'light', 'paper');
    const use = Array.from(notice?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes(`Use ${shade}`),
    );
    expect(use).toBeDefined();

    use?.click();
    await stable();
    expect(theme.customTheme().accent).toBe(shade);
    expect(settingsApi.update).toHaveBeenLastCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, accent: shade },
    });
    expect(page.querySelector('ui-notice')).toBeNull();
    // The shade is a swatch of its own now, checked; the "+" panel closed.
    expect(radioIn(page, 'Accent color', shade).checked).toBe(true);
  });

  it('saves an own background color that keeps text at 4.5:1 and draws it as a swatch (#335)', async () => {
    const { root: page, theme, settingsApi, stable, harness } = await setup();
    radioIn(page, 'Theme', 'Custom').click();
    await stable();

    const picker = await pickerNamed(harness, 'Your own background color');
    await picker.open();
    await picker.setHex('#FDF6E3');
    // Typing only previews; "Add color" is the explicit choice (#350).
    await picker.add();
    await stable();

    expect(theme.customTheme().background).toBe('#fdf6e3');
    expect(settingsApi.update).toHaveBeenLastCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, background: '#fdf6e3' },
    });
    expect(root.getAttribute(CUSTOM_THEME_ATTRIBUTE.Background)).toBe('own');
    expect(root.style.getPropertyValue('--bg')).toBe('#fdf6e3');
    expect(radioIn(page, 'Background', '#fdf6e3').checked).toBe(true);

    // A curated background takes over and drops the custom property.
    radioIn(page, 'Background', 'Mist').click();
    await stable();
    expect(root.style.getPropertyValue('--bg')).toBe('');
  });

  it('warns about a background that hides the text and offers the nearest readable shade (#335)', async () => {
    const { root: page, theme, settingsApi, stable, harness } = await setup();
    radioIn(page, 'Theme', 'Custom').click();
    await stable();
    settingsApi.update.mockClear();

    const picker = await pickerNamed(harness, 'Your own background color');
    await picker.open();
    await picker.setHex('#808080');
    // Typing only previews; "Add color" is the explicit choice (#350).
    await picker.add();
    await stable();

    expect(theme.customTheme().background).toBe(CUSTOM_THEME_DEFAULT.background);
    expect(settingsApi.update).not.toHaveBeenCalled();
    const notice = page.querySelector('ui-notice');
    expect(notice?.textContent).toMatch(/Text is hard to read on this background/u);
    const shade = nearestReadableBackground('#808080', 'light');
    const use = Array.from(notice?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes(`Use ${shade}`),
    );
    expect(use).toBeDefined();
    use?.click();
    await stable();
    expect(theme.customTheme().background).toBe(shade);
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

  describe('text, layout, cards and sidebar (#285)', () => {
    function switchNamed(page: HTMLElement, name: string): HTMLButtonElement {
      const found = page.querySelector<HTMLButtonElement>(
        `button[role="switch"][aria-label="${name}"]`,
      );
      if (!found) {
        throw new Error(`No switch "${name}"`);
      }
      return found;
    }

    it('sets text size, font, density and the preview image on <html> and the account', async () => {
      const { root: page, settingsApi, stable, theme } = await setup();

      radioIn(page, 'Text size', '125%').click();
      await stable();
      radioIn(page, 'Font', 'Readable').click();
      await stable();
      radioIn(page, 'Density', 'Compact').click();
      await stable();
      radioIn(page, 'Preview image', 'Small').click();
      await stable();

      expect(settingsApi.update).toHaveBeenCalledWith({ textSize: 'xl' });
      expect(settingsApi.update).toHaveBeenCalledWith({ font: 'readable' });
      expect(settingsApi.update).toHaveBeenCalledWith({ density: 'compact' });
      expect(settingsApi.update).toHaveBeenCalledWith({ cardPreview: 'small' });
      expect(theme.layout().textSize).toBe('xl');
      expect(root.getAttribute(LAYOUT_ATTRIBUTE.TextSize)).toBe('xl');
      expect(root.getAttribute(LAYOUT_ATTRIBUTE.Font)).toBe('readable');
      expect(root.getAttribute(LAYOUT_ATTRIBUTE.Density)).toBe('compact');
      expect(root.getAttribute(LAYOUT_ATTRIBUTE.CardPreview)).toBe('small');
    });

    it('hides site, notes and tags of cards with the switches', async () => {
      const { root: page, settingsApi, stable } = await setup();

      for (const [name, key, attribute] of [
        ['Show site', 'cardSite', LAYOUT_ATTRIBUTE.CardSite],
        ['Show notes', 'cardNotes', LAYOUT_ATTRIBUTE.CardNotes],
        ['Show tags', 'cardTags', LAYOUT_ATTRIBUTE.CardTags],
      ] as const) {
        switchNamed(page, name).click();
        await stable();
        expect(settingsApi.update).toHaveBeenCalledWith({ [key]: false });
        expect(root.getAttribute(attribute)).toBe(LAYOUT_OFF);
      }
    });

    it('rolls a layout change back with a toast when saving fails', async () => {
      const { root: page, show, stable, theme } = await setup({ fail: true });

      radioIn(page, 'Density', 'Compact').click();
      await stable();

      expect(theme.layout().density).toBe('comfortable');
      expect(root.hasAttribute(LAYOUT_ATTRIBUTE.Density)).toBe(false);
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Couldn't save the appearance" }),
      );
    });

    it('turns folder colours off and on here, the only place for them (#315)', async () => {
      const { root: page, settingsApi, stable } = await setup();
      await vi.waitFor(async () => {
        await stable();
        expect(switchNamed(page, 'Folder colors').getAttribute('aria-checked')).toBe('true');
      });

      switchNamed(page, 'Folder colors').click();
      await stable();
      expect(settingsApi.update).toHaveBeenCalledWith({ folderColours: false });
      expect(switchNamed(page, 'Folder colors').getAttribute('aria-checked')).toBe('false');

      switchNamed(page, 'Folder colors').click();
      await stable();
      expect(settingsApi.update).toHaveBeenLastCalledWith({ folderColours: true });
    });

    it('puts folder colours back with a toast when saving fails', async () => {
      const { root: page, show, stable } = await setup({ fail: true });
      await vi.waitFor(async () => {
        await stable();
        expect(switchNamed(page, 'Folder colors').getAttribute('aria-checked')).toBe('true');
      });

      switchNamed(page, 'Folder colors').click();
      await vi.waitFor(async () => {
        await stable();
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Danger }));
        expect(switchNamed(page, 'Folder colors').getAttribute('aria-checked')).toBe('true');
      });
    });
  });

  it('has no axe violations, with the custom options open too', async () => {
    const { root: page, stable } = await setup();
    expect(await axeViolations(page)).toEqual([]);

    radioIn(page, 'Theme', 'Custom').click();
    await stable();
    expect(await axeViolations(page)).toEqual([]);
  });
});
