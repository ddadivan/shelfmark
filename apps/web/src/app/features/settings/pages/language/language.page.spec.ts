import { TestBed } from '@angular/core/testing';
import {
  LANGUAGE_SETTINGS_DEFAULT,
  LIBRARY_SETTINGS_DEFAULT,
  type LanguageSettings,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { ToastService, TOAST_KIND } from '@shelfmark/ui';
import { of, switchMap, throwError, timer } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { activeLang, setActiveLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { TRASH_API } from '../../../trash/models/trash-api.const';
import { USER_SETTINGS_API } from '../../models/user-settings-api.const';
import type { UserSettingsApi } from '../../models/user-settings-api.interface';
import LanguageSettingsPage from './language.page';

function languagePart(request: UpdateUserSettingsRequest): Partial<LanguageSettings> {
  const part: Partial<LanguageSettings> = {};
  for (const key of Object.keys(LANGUAGE_SETTINGS_DEFAULT) as (keyof LanguageSettings)[]) {
    if (request[key] !== undefined) {
      Object.assign(part, { [key]: request[key] });
    }
  }
  return part;
}

async function setup(options: { failUpdate?: boolean } = {}) {
  const settingsApi = {
    get: vi.fn<UserSettingsApi['get']>(() =>
      of({
        trashRetentionDays: 30 as const,
        folderColours: true,
        pauseHistory: false,
        customColours: [],
        customEmoji: [],
        ...MOCK_APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      }),
    ),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      options.failUpdate
        ? timer(10).pipe(switchMap(() => throwError(() => new Error('boom'))))
        : of({
            trashRetentionDays: 30 as const,
            folderColours: true,
            pauseHistory: false,
            customColours: [],
            customEmoji: [],
            ...MOCK_APPEARANCE_DEFAULTS,
            ...LIBRARY_SETTINGS_DEFAULT,
            ...languagePart(request),
            languageSaved: true,
          }),
    ),
  };
  const toasts: Parameters<ToastService['show']>[0][] = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: settingsApi },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
      {
        provide: ToastService,
        useValue: { show: (toast: (typeof toasts)[number]) => toasts.push(toast) },
      },
    ],
  });
  const page = await setupSettingsPage(LanguageSettingsPage, 'language');
  await page.harness.fixture.whenStable();
  return { ...page, settingsApi, toasts };
}

function radio(root: HTMLElement, label: string): HTMLInputElement {
  const found = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (input) => input.closest('label')?.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`No radio "${label}"`);
  }
  return found;
}

/** The rows of the language list: the visible name, its `lang` and the flag file it shows. */
function rows(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLLabelElement>('[data-testid="interface-language"] label'),
  ).map((label) => ({
    name: label.querySelector('.ui-radio__title')?.textContent?.trim(),
    lang: label.querySelector('.ui-radio__title')?.getAttribute('lang'),
    flag: label.querySelector('ui-flag img')?.getAttribute('src') ?? null,
    icon: label.querySelector('ui-icon') !== null,
  }));
}

describe('LanguageSettingsPage', () => {
  afterEach(() => {
    setActiveLang('en');
    localStorage.clear();
  });

  it('shows only the language: no dates, no dropdown (#315)', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Language');
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Language',
    ]);
    expect(root.textContent).toContain('Your links and notes stay as they are');
    expect(root.textContent).toContain('Date and time formats are in Appearance');
    for (const text of ['Date format', 'Week starts on', 'Preview']) {
      expect(root.textContent).not.toContain(text);
    }
    expect(root.querySelector('ui-select, [role="combobox"]')).toBeNull();
    expect(root.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
      'Interface language',
    );
  });

  it('lists every language with its flag in its own name, then "Match my browser"', async () => {
    const { root } = await setup();

    expect(rows(root)).toEqual([
      { name: 'English', lang: 'en', flag: 'assets/ui/flags/gb.svg', icon: false },
      { name: 'Français', lang: 'fr', flag: 'assets/ui/flags/fr.svg', icon: false },
      { name: 'Deutsch', lang: 'de', flag: 'assets/ui/flags/de.svg', icon: false },
      { name: 'Italiano', lang: 'it', flag: 'assets/ui/flags/it.svg', icon: false },
      { name: 'Español', lang: 'es', flag: 'assets/ui/flags/es.svg', icon: false },
      { name: 'Português', lang: 'pt', flag: 'assets/ui/flags/br.svg', icon: false },
      { name: 'Match my browser', lang: null, flag: null, icon: true },
    ]);
    expect(radio(root, 'Match my browser').checked).toBe(true);
  });

  it('switches the interface language at once and saves it', async () => {
    const { root, settingsApi, harness } = await setup();

    radio(root, 'Français').click();
    await vi.waitFor(async () => {
      await TestBed.inject(LocaleService).settled();
      harness.fixture.detectChanges();
      expect(activeLang()).toBe('fr');
      expect(root.querySelector('h1')?.textContent).toContain('Langue');
    });
    expect(settingsApi.update).toHaveBeenCalledWith({ language: 'fr' });
    expect(rows(root).at(-1)?.name).toBe('Comme mon navigateur');
    expect(radio(root, 'Français').checked).toBe(true);
  });

  it('has no spell-check row: it sits next to the note field since #315', async () => {
    const { root } = await setup();

    expect(root.textContent).not.toContain('Spell-check');
    expect(root.querySelector('button[role="switch"]')).toBeNull();
  });

  it('puts a choice back and says so when saving fails', async () => {
    const { root, toasts, harness } = await setup({ failUpdate: true });

    radio(root, 'Deutsch').click();
    await vi.waitFor(() => {
      expect(toasts).toHaveLength(1);
    });
    harness.fixture.detectChanges();
    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Danger,
      title: 'Couldn’t save the setting',
    });
    expect(TestBed.inject(LocaleService).settings().language).toBe('browser');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});
