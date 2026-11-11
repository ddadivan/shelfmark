import { INTERFACE_LANGUAGE, type InterfaceLanguage, type WeekStart } from '@shelfmark/contracts';
import { WEEK_START } from '@shelfmark/contracts';
import { APP_LANG } from './models/app-lang.const';
import type { AppLang } from './models/app-lang.type';

const APP_LANGS: readonly string[] = Object.values(APP_LANG);

/** Regions whose week starts on Sunday, for browsers without `Intl.Locale#getWeekInfo`. */
const SUNDAY_REGIONS = new Set(['US', 'CA', 'BR', 'MX', 'JP', 'IL', 'PH', 'KR', 'TW', 'IN', 'ZA']);

export function isAppLang(value: unknown): value is AppLang {
  return typeof value === 'string' && APP_LANGS.includes(value);
}

/** The language part of a BCP 47 tag, lower case (`pt-BR` → `pt`). */
function baseOf(tag: string): string {
  return tag.split(/[-_]/u)[0]?.toLowerCase() ?? '';
}

/**
 * The translation to show: the chosen language, or for "Match my browser" the first browser
 * language the app has, else English.
 */
export function resolveAppLang(
  language: InterfaceLanguage,
  browserLangs: readonly string[],
): AppLang {
  if (language !== INTERFACE_LANGUAGE.Browser) {
    return language;
  }
  for (const tag of browserLangs) {
    const base = baseOf(tag);
    if (isAppLang(base)) {
      return base;
    }
  }
  return APP_LANG.En;
}

/**
 * The locale for `Intl`: the browser's own tag when it speaks the same language (`en-GB` keeps
 * day-month order and the 24-hour clock, `pt-PT` its conventions), else the bare language (`de`).
 */
export function resolveIntlLocale(lang: AppLang, browserLangs: readonly string[]): string {
  for (const tag of browserLangs) {
    if (baseOf(tag) === lang) {
      try {
        return Intl.getCanonicalLocales(tag)[0] ?? lang;
      } catch {
        return lang;
      }
    }
  }
  return lang;
}

/** ISO weekday the week starts on: 1 Monday … 7 Sunday. */
export function resolveFirstDay(weekStart: WeekStart, locale: string): number {
  if (weekStart === WEEK_START.Monday) {
    return 1;
  }
  if (weekStart === WEEK_START.Sunday) {
    return 7;
  }
  try {
    const intlLocale: unknown = new Intl.Locale(locale);
    const info = weekInfoOf(intlLocale);
    if (info !== null) {
      return info;
    }
    const region = new Intl.Locale(locale).maximize().region ?? '';
    return SUNDAY_REGIONS.has(region) ? 7 : 1;
  } catch {
    return 1;
  }
}

/** `firstDay` of `Intl.Locale#getWeekInfo()` (or the older `weekInfo` getter) where the browser has it. */
function weekInfoOf(locale: unknown): number | null {
  if (typeof locale !== 'object' || locale === null) {
    return null;
  }
  const record = locale as { getWeekInfo?: unknown; weekInfo?: unknown };
  const info: unknown =
    typeof record.getWeekInfo === 'function'
      ? (record.getWeekInfo as () => unknown).call(locale)
      : record.weekInfo;
  if (typeof info === 'object' && info !== null && 'firstDay' in info) {
    const firstDay = (info as { firstDay: unknown }).firstDay;
    return typeof firstDay === 'number' && firstDay >= 1 && firstDay <= 7 ? firstDay : null;
  }
  return null;
}
