import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injector, Service, computed, effect, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  DATE_FORMAT,
  LANGUAGE_SETTINGS_DEFAULT,
  TIME_FORMAT,
  isLanguageSettings,
  type DateFormat,
  type LanguageSettings,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { activeLang, setActiveLang } from './active-lang';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';
import { LANGUAGE_STORAGE_KEY } from './models/language-storage-key.const';
import { relativeTime } from './relative-time';
import { resolveAppLang, resolveFirstDay, resolveIntlLocale } from './resolve-locale';

const STORAGE_EVENT = 'storage';
/** Keys a copy stored before they were retired may still hold (`spellcheck`, #326); dropped on read. */
const RETIRED_STORAGE_KEYS: readonly string[] = ['spellcheck'];
const LANGUAGE_CHANGE_EVENT = 'languagechange';

type DateInput = Date | number | string;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Saved dates up to this age read as relative text on a card. */
const SAVED_RELATIVE_DAYS = 14;

/**
 * Owns the interface language and how dates, times and numbers look (#274). The only writer of
 * `<html lang>` and of Transloco's active language. The settings come from the account
 * (`UserSettingsStore` calls `apply`) and are kept in `localStorage` (`sm-language`) so the first
 * paint is already in the right language; a guest's choice lives only there. "Match my browser"
 * follows `navigator.languages` (and its `languagechange` event), falling back to English.
 *
 * A switch loads the language file first (a lazy chunk) and then switches everything at once:
 * Transloco, `activeLang` (plural keys), `locale` (`Intl`) and `<html lang>`. No reload.
 */
@Service()
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  /** Resolved on the first switch only: code that just reads the settings needs no Transloco. */
  private readonly transloco = (): TranslocoService => this.injector.get(TranslocoService);

  private readonly settingsState = signal<LanguageSettings>({ ...LANGUAGE_SETTINGS_DEFAULT });
  private readonly browserLangs = signal<readonly string[]>(this.readBrowserLangs());

  /** The language settings in use (account or local copy). */
  readonly settings = this.settingsState.asReadonly();
  /** The language the settings ask for; `lang` follows once its file is loaded. */
  readonly wantedLang = computed<AppLang>(() =>
    resolveAppLang(this.settingsState().language, this.browserLangs()),
  );
  /** The translation on screen. */
  readonly lang = activeLang;
  /** The language "Match my browser" resolves to right now. */
  readonly browserLang = computed<AppLang>(() =>
    resolveAppLang(LANGUAGE_SETTINGS_DEFAULT.language, this.browserLangs()),
  );
  /** BCP 47 locale for `Intl` (the browser's region when it speaks the same language). */
  readonly locale = computed(() => resolveIntlLocale(activeLang(), this.browserLangs()));
  /** ISO weekday the week starts on: 1 Monday … 7 Sunday. */
  readonly firstDay = computed(() =>
    resolveFirstDay(this.settingsState().weekStart, this.locale()),
  );
  private readonly hourCycle = computed<Intl.DateTimeFormatOptions['hourCycle']>(() => {
    switch (this.settingsState().timeFormat) {
      case TIME_FORMAT.H24:
        return 'h23';
      case TIME_FORMAT.H12:
        return 'h12';
      default:
        return undefined;
    }
  });

  private initialized = false;
  private switches = 0;

  constructor() {
    // A new instance starts from the bundled English, as the app does before `init()`; a switch
    // still loading when the injector goes away (a test, a destroyed app) never lands.
    setActiveLang(APP_LANG.En);
    this.destroyRef.onDestroy(() => this.switches++);
    effect(() => {
      const wanted = this.wantedLang();
      if (this.initialized && wanted !== activeLang()) {
        void this.switchTo(wanted);
      }
    });
    effect(() => {
      this.document.documentElement.lang = activeLang();
    });
  }

  /**
   * Reads the stored settings, loads their language and switches to it before the first render;
   * follows other tabs and the browser's language list. Idempotent.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.readStored();
    const view = this.document.defaultView;
    if (view) {
      // `null`: `localStorage.clear()` in another tab.
      const keys: (string | null)[] = [LANGUAGE_STORAGE_KEY, null];
      const onStorage = (event: StorageEvent): void => {
        if (keys.includes(event.key)) {
          this.readStored();
        }
      };
      const onLanguages = (): void => this.browserLangs.set(this.readBrowserLangs());
      view.addEventListener(STORAGE_EVENT, onStorage);
      view.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguages);
      this.destroyRef.onDestroy(() => {
        view.removeEventListener(STORAGE_EVENT, onStorage);
        view.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguages);
      });
    }
    await this.switchTo(this.wantedLang());
    this.initialized = true;
  }

  /** Applies (and remembers in this browser) the given settings; the account settings call this. */
  apply(settings: LanguageSettings): void {
    const next: LanguageSettings = {
      language: settings.language,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      weekStart: settings.weekStart,
    };
    this.settingsState.set(next);
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode, blocked): the choice lasts for the session.
    }
  }

  /** This browser holds valid language settings (chosen before the account kept them, or as a guest). */
  hasStoredLanguage(): boolean {
    return isLanguageSettings(this.readStorage());
  }

  /** Resolves once the wanted language is on screen (or failed to load and English stayed). */
  async settled(): Promise<void> {
    if (this.wantedLang() !== activeLang()) {
      await this.switchTo(this.wantedLang());
    }
  }

  /** An `Intl.DateTimeFormat` in the active locale; a format with hours follows the Time setting. */
  dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const withHours = options.hour !== undefined || options.timeStyle !== undefined;
    const hourCycle = this.hourCycle();
    return new Intl.DateTimeFormat(
      this.locale(),
      withHours && hourCycle ? { ...options, hourCycle } : options,
    );
  }

  /** A date in the chosen date format (or `format`; the language's own medium date by default). */
  formatDate(value: DateInput, format: DateFormat = this.settingsState().dateFormat): string {
    const date = toDate(value);
    if (format === DATE_FORMAT.Default) {
      return this.dateTimeFormat({ dateStyle: 'medium' }).format(date);
    }
    const numeric = format !== DATE_FORMAT.Medium;
    const parts = this.dateTimeFormat({
      day: numeric ? '2-digit' : 'numeric',
      month: numeric ? '2-digit' : 'short',
      year: 'numeric',
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((p) => p.type === type)?.value ?? '';
    const [day, month, year] = [part('day'), part('month'), part('year')];
    // Fixed patterns by choice (DATE_FORMAT); the parts themselves come from Intl.
    switch (format) {
      case DATE_FORMAT.Dmy:
        return `${day}.${month}.${year}`;
      case DATE_FORMAT.Mdy:
        return `${month}/${day}/${year}`;
      case DATE_FORMAT.Iso:
        return `${year}-${month}-${day}`;
      default:
        return `${day} ${month} ${year}`;
    }
  }

  /** Hours and minutes, by the Time setting. */
  formatTime(value: DateInput): string {
    return this.dateTimeFormat({ hour: 'numeric', minute: '2-digit' }).format(toDate(value));
  }

  /** The weekday name (`long` Tuesday, `short` Tue). */
  formatWeekday(value: DateInput, width: 'long' | 'short' = 'short'): string {
    return this.dateTimeFormat({ weekday: width }).format(toDate(value));
  }

  /** "3 weeks ago", "yesterday", "now" in the active language. */
  formatRelative(iso: string, now: number): string {
    return relativeTime(iso, now, this.locale());
  }

  /**
   * The date a link was saved, for a card: "2 days ago", "Last week", then a calendar date. The
   * date follows the date format setting; the language's own format drops the year within the
   * current year ("Oct 28"), the fixed formats always show it.
   */
  formatSaved(iso: string, now: number): string {
    const time = new Date(iso).getTime();
    if (now - time < SAVED_RELATIVE_DAYS * 86_400_000) {
      const text = this.formatRelative(iso, now);
      return text.charAt(0).toLocaleUpperCase(this.locale()) + text.slice(1);
    }
    const date = new Date(time);
    if (
      this.settingsState().dateFormat === DATE_FORMAT.Default &&
      date.getFullYear() === new Date(now).getFullYear()
    ) {
      return this.dateTimeFormat({ month: 'short', day: 'numeric' }).format(date);
    }
    return this.formatDate(date);
  }

  /** A number with the active language's grouping (1,234 / 1 234 / 1.234). */
  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  private async switchTo(lang: AppLang): Promise<void> {
    const id = ++this.switches;
    let target = lang;
    try {
      await firstValueFrom(this.transloco().load(lang));
    } catch {
      // The chunk did not load (offline, a new deploy): stay readable in English.
      target = APP_LANG.En;
      await firstValueFrom(this.transloco().load(target)).catch(() => undefined);
    }
    if (id !== this.switches) {
      return; // A later switch won.
    }
    this.transloco().setActiveLang(target);
    setActiveLang(target);
  }

  private readStored(): void {
    const stored = this.readStorage();
    this.settingsState.set(
      isLanguageSettings(stored) ? { ...stored } : { ...LANGUAGE_SETTINGS_DEFAULT },
    );
  }

  private readStorage(): unknown {
    let stored: unknown;
    try {
      stored = JSON.parse(
        this.document.defaultView?.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? 'null',
      );
    } catch {
      return null;
    }
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      return stored;
    }
    return Object.fromEntries(
      Object.entries(stored).filter(([key]) => !RETIRED_STORAGE_KEYS.includes(key)),
    );
  }

  private readBrowserLangs(): readonly string[] {
    const navigator = this.document.defaultView?.navigator;
    if (!navigator) {
      return [];
    }
    return navigator.languages?.length ? navigator.languages : [navigator.language];
  }
}
