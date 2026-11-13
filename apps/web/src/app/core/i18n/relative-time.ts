import { RELATIVE_TIME_UNITS } from './models/relative-time-units.const';

const formats = new Map<string, Intl.RelativeTimeFormat>();

/**
 * The relative-time formatter of a locale, built once. The first one a page builds loads the
 * locale's ICU data, several milliseconds on a slow phone (#359): `LocaleService.init()` builds it
 * in a task of its own while the language file downloads, so the first render (the landing's app
 * preview, a library full of cards) only looks it up.
 */
export function relativeTimeFormat(locale: string): Intl.RelativeTimeFormat {
  let format = formats.get(locale);
  if (!format) {
    format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    formats.set(locale, format);
  }
  return format;
}

/**
 * "3 weeks ago", "yesterday", "now": the ISO timestamp relative to `now`, in the given locale
 * (`Intl.RelativeTimeFormat`, so it follows the active language). Future times count as now.
 */
export function relativeTime(iso: string, now: number, locale: string): string {
  const format = relativeTimeFormat(locale);
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  for (const [unit, size] of RELATIVE_TIME_UNITS) {
    if (seconds >= size) {
      return format.format(-Math.floor(seconds / size), unit);
    }
  }
  return format.format(0, 'second');
}
