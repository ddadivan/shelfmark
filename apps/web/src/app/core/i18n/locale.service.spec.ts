import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import {
  DATE_FORMAT,
  INTERFACE_LANGUAGE,
  LANGUAGE_SETTINGS_DEFAULT,
  TIME_FORMAT,
  WEEK_START,
  type LanguageSettings,
} from '@shelfmark/contracts';
import { activeLang, setActiveLang } from './active-lang';
import { AppTranslocoLoader } from './app-transloco.loader';
import { LocaleService } from './locale.service';
import { LANGUAGE_STORAGE_KEY } from './models/language-storage-key.const';
import { translocoConfig } from './transloco.config';

const DATE = new Date(2026, 10, 10, 15, 7);

function stubLanguages(languages: readonly string[]): void {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
}

function setup(stored?: unknown): { locale: LocaleService; transloco: TranslocoService } {
  if (stored !== undefined) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(stored));
  }
  TestBed.configureTestingModule({
    providers: [provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader })],
  });
  return { locale: TestBed.inject(LocaleService), transloco: TestBed.inject(TranslocoService) };
}

const settings = (change: Partial<LanguageSettings>): LanguageSettings => ({
  ...LANGUAGE_SETTINGS_DEFAULT,
  ...change,
});

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.clear();
    stubLanguages(['en-US', 'en']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setActiveLang('en');
    localStorage.clear();
  });

  it('starts in English with the defaults when nothing is stored', async () => {
    const { locale, transloco } = setup();
    await locale.init();
    expect(locale.settings()).toEqual(LANGUAGE_SETTINGS_DEFAULT);
    expect(locale.lang()).toBe('en');
    expect(transloco.getActiveLang()).toBe('en');
    TestBed.tick();
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    expect(locale.locale()).toBe('en-US');
  });

  it('matches the browser language before the first render', async () => {
    stubLanguages(['de-DE', 'en']);
    const { locale, transloco } = setup();
    await locale.init();
    expect(locale.lang()).toBe('de');
    expect(locale.locale()).toBe('de-DE');
    expect(transloco.translate('landing.hero.line1')).toBe('Link einfügen.');
    expect(locale.browserLang()).toBe('de');
  });

  it('uses the stored choice for the first paint', async () => {
    const { locale } = setup(settings({ language: INTERFACE_LANGUAGE.It }));
    await locale.init();
    expect(locale.lang()).toBe('it');
    expect(locale.hasStoredLanguage()).toBe(true);
  });

  it('ignores a broken stored value', async () => {
    const { locale } = setup({ language: 'uk' });
    await locale.init();
    expect(locale.settings()).toEqual(LANGUAGE_SETTINGS_DEFAULT);
    expect(locale.hasStoredLanguage()).toBe(false);
  });

  it('switches everything at once, without a reload, and remembers it', async () => {
    const { locale, transloco } = setup();
    await locale.init();
    locale.apply(settings({ language: INTERFACE_LANGUAGE.Fr }));
    TestBed.tick();
    await locale.settled();
    expect(activeLang()).toBe('fr');
    expect(transloco.getActiveLang()).toBe('fr');
    expect(transloco.translate('landing.hero.line1')).toBe('Collez un lien.');
    TestBed.tick();
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('fr');
    expect(JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? 'null')).toMatchObject({
      language: 'fr',
    });
  });

  it('follows another tab', async () => {
    const { locale } = setup();
    await locale.init();
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify(settings({ language: INTERFACE_LANGUAGE.Es })),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY }));
    expect(locale.settings().language).toBe('es');
  });

  it('follows a change of the browser languages', async () => {
    const { locale } = setup();
    await locale.init();
    stubLanguages(['pt-BR']);
    window.dispatchEvent(new Event('languagechange'));
    expect(locale.wantedLang()).toBe('pt');
  });

  it('formats dates in the chosen format', async () => {
    const { locale } = setup();
    await locale.init();
    expect(locale.formatDate(DATE)).toBe('Nov 10, 2026');
    expect(locale.formatDate(DATE, DATE_FORMAT.Medium)).toBe('10 Nov 2026');
    expect(locale.formatDate(DATE, DATE_FORMAT.Dmy)).toBe('10.11.2026');
    expect(locale.formatDate(DATE, DATE_FORMAT.Mdy)).toBe('11/10/2026');
    expect(locale.formatDate(DATE.toISOString(), DATE_FORMAT.Iso)).toBe('2026-11-10');
    locale.apply(settings({ dateFormat: DATE_FORMAT.Iso }));
    expect(locale.formatDate(DATE.getTime())).toBe('2026-11-10');
  });

  it('formats dates and numbers in the active language', async () => {
    stubLanguages(['de-DE']);
    const { locale } = setup();
    await locale.init();
    expect(locale.formatDate(DATE)).toBe('10.11.2026');
    expect(locale.formatDate(DATE, DATE_FORMAT.Medium)).toBe('10 Nov. 2026');
    expect(locale.formatWeekday(DATE, 'long')).toBe('Dienstag');
    expect(locale.formatNumber(1234.5)).toBe('1.234,5');
    expect(locale.formatRelative(new Date(Date.now() - 86_400_000).toISOString(), Date.now())).toBe(
      'gestern',
    );
  });

  it('follows the clock setting', async () => {
    const { locale } = setup();
    await locale.init();
    expect(locale.formatTime(DATE)).toBe('3:07 PM');
    locale.apply(settings({ timeFormat: TIME_FORMAT.H24 }));
    expect(locale.formatTime(DATE)).toBe('15:07');
    locale.apply(settings({ timeFormat: TIME_FORMAT.H12 }));
    expect(locale.dateTimeFormat({ hour: 'numeric' }).resolvedOptions().hourCycle).toBe('h12');
    expect(locale.dateTimeFormat({ day: 'numeric' }).resolvedOptions().hourCycle).toBeUndefined();
  });

  it('follows the week start setting', async () => {
    const { locale } = setup();
    await locale.init();
    expect(locale.firstDay()).toBe(7);
    locale.apply(settings({ weekStart: WEEK_START.Monday }));
    expect(locale.firstDay()).toBe(1);
  });

  it('exposes spell-check', async () => {
    const { locale } = setup();
    await locale.init();
    expect(locale.spellcheck()).toBe(true);
    locale.apply(settings({ spellcheck: false }));
    expect(locale.spellcheck()).toBe(false);
  });

  it('keeps English when a language file fails to load', async () => {
    const { locale } = setup();
    vi.spyOn(AppTranslocoLoader.prototype, 'getTranslation').mockImplementation((lang) =>
      lang === 'de' ? Promise.reject(new Error('offline')) : Promise.resolve({}),
    );
    await locale.init();
    locale.apply(settings({ language: INTERFACE_LANGUAGE.De }));
    await locale.settled();
    expect(activeLang()).toBe('en');
  });

  it('keeps working without storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { locale } = setup();
    await locale.init();
    expect(() => locale.apply(settings({ spellcheck: false }))).not.toThrow();
    expect(locale.spellcheck()).toBe(false);
  });

  it('initialises once', async () => {
    const { locale } = setup();
    await locale.init();
    await expect(locale.init()).resolves.toBeUndefined();
  });
});
