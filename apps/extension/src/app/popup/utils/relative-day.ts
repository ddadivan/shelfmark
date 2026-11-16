const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "2 days ago", "yesterday", "3 hours ago" in the popup's language, for "You saved this …". */
export function relativeDay(iso: string, lang: string, now: number = Date.now()): string {
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const diff = new Date(iso).getTime() - now;
  if (Math.abs(diff) < HOUR_MS) return format.format(Math.round(diff / MINUTE_MS), 'minute');
  if (Math.abs(diff) < DAY_MS) return format.format(Math.round(diff / HOUR_MS), 'hour');
  const days = Math.round(diff / DAY_MS);
  if (Math.abs(days) < 30) return format.format(days, 'day');
  if (Math.abs(days) < 365) return format.format(Math.round(days / 30), 'month');
  return format.format(Math.round(days / 365), 'year');
}
