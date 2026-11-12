import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  LANGUAGE_SETTINGS_DEFAULT,
  LIBRARY_SETTINGS_DEFAULT,
  type LanguageSettings,
  type UpdateUserSettingsRequest,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { SelectComponent, ToastService, TOAST_KIND } from '@shelfmark/ui';
import { of, switchMap, throwError, timer } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { setActiveLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { TRASH_API } from '../../../trash/models/trash-api.const';
import { USER_SETTINGS_API } from '../../models/user-settings-api.const';
import type { UserSettingsApi } from '../../models/user-settings-api.interface';
import { DateTimeSettingsComponent } from './date-time-settings.component';

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
  const page = await setupSettingsPage(DateTimeSettingsComponent, 'appearance');
  await page.harness.fixture.whenStable();
  const selects = (): SelectComponent[] =>
    page.harness.fixture.debugElement
      .queryAll(By.directive(SelectComponent))
      .map((debug) => debug.componentInstance as SelectComponent);
  return { ...page, settingsApi, toasts, selects };
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

describe('DateTimeSettingsComponent (Settings › Appearance, #315)', () => {
  afterEach(() => {
    setActiveLang('en');
    localStorage.clear();
  });

  it('shows the Dates and numbers section with its rows', async () => {
    const { root } = await setup();

    expect([...root.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      'Dates and numbers',
    ]);
    for (const text of ['Date format', 'Time', 'Week starts on', 'Preview']) {
      expect(root.textContent).toContain(text);
    }
    expect(
      Array.from(root.querySelectorAll('input[type="radio"]')).map((input) =>
        input.closest('label')?.textContent?.trim(),
      ),
    ).toEqual(['Auto', '24-hour', '12-hour', 'Auto', 'Monday', 'Sunday']);
    expect(radio(root, '24-hour').checked).toBe(false);
  });

  it('shows date format samples and saves a choice; the preview follows', async () => {
    const { root, selects, settingsApi, harness } = await setup();
    const dates = selects()[0];
    expect(dates?.options().map((option) => option.id)).toEqual([
      'default',
      'medium',
      'dmy',
      'mdy',
      'iso',
    ]);
    expect(dates?.options()[0]?.name).toMatch(/^Language default \(.+\)$/);

    dates?.value.set('iso');
    await harness.fixture.whenStable();

    expect(settingsApi.update).toHaveBeenCalledWith({ dateFormat: 'iso' });
    const preview = root.querySelector('[data-testid="language-preview"]')?.textContent ?? '';
    expect(preview).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('saves the clock and the week start', async () => {
    const { root, settingsApi, harness } = await setup();

    radio(root, '24-hour').click();
    await harness.fixture.whenStable();
    expect(settingsApi.update).toHaveBeenCalledWith({ timeFormat: 'h24' });

    radio(root, 'Sunday').click();
    await harness.fixture.whenStable();
    expect(settingsApi.update).toHaveBeenLastCalledWith({ weekStart: 'sunday' });
  });

  it('puts a choice back and says so when saving fails', async () => {
    const { root, toasts, harness } = await setup({ failUpdate: true });

    radio(root, '12-hour').click();
    await vi.waitFor(() => {
      expect(toasts).toHaveLength(1);
    });
    harness.fixture.detectChanges();
    expect(toasts[0]).toMatchObject({
      kind: TOAST_KIND.Danger,
      title: 'Couldn’t save the setting',
    });
    expect(TestBed.inject(LocaleService).settings().timeFormat).toBe('default');
  });

  it('ignores values outside the allow-lists', async () => {
    const { selects, settingsApi, harness } = await setup();
    selects()[0]?.value.set('yyyy');
    await harness.fixture.whenStable();
    expect(settingsApi.update).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { root } = await setup();
    expect(await axeViolations(root)).toEqual([]);
  });
});
