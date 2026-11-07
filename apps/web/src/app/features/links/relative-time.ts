const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * "3 weeks ago", "yesterday", "now": the ISO timestamp relative to `now`, in the given locale
 * (`Intl.RelativeTimeFormat`, so it follows the active language). Future times count as now.
 */
export function relativeTime(iso: string, now: number, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return format.format(-Math.floor(seconds / size), unit);
    }
  }
  return format.format(0, 'second');
}
