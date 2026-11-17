import type { CalendarDay } from './models/calendar-day.interface';
import type { CalendarWeekday } from './models/calendar-weekday.interface';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days are counted in UTC, so a daylight saving change never skips or repeats one. */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/** `YYYY-MM-DD` of a UTC date. */
export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The UTC date of a `YYYY-MM-DD` string, or `null` when it is not one. */
export function parseIsoDay(iso: string | null | undefined): Date | null {
  const match = iso ? ISO_DAY.exec(iso) : null;
  if (!match) {
    return null;
  }
  const date = utc(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toIsoDay(date) === iso ? date : null;
}

/** The local calendar day of `now` as `YYYY-MM-DD`. */
export function localIsoDay(now: Date): string {
  return toIsoDay(utc(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** `iso` moved by `days` (negative goes back). */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDay(iso) ?? new Date(0);
  return toIsoDay(new Date(date.getTime() + days * MS_PER_DAY));
}

/** `iso` moved by whole months, the day kept or cut to the end of the shorter month. */
export function addMonths(iso: string, months: number): string {
  const date = parseIsoDay(iso) ?? new Date(0);
  const first = utc(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
  const last = utc(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();
  return toIsoDay(
    utc(first.getUTCFullYear(), first.getUTCMonth(), Math.min(date.getUTCDate(), last)),
  );
}

/** First day (`YYYY-MM-01`) of the month of `iso`. */
export function monthOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** ISO weekday of a UTC date: 1 Monday … 7 Sunday. */
function isoWeekday(date: Date): number {
  return date.getUTCDay() === 0 ? DAYS_PER_WEEK : date.getUTCDay();
}

/** Days from the week's first day (`firstDay`, ISO 1 to 7) to `iso`: 0 … 6. */
export function weekOffset(iso: string, firstDay: number): number {
  const date = parseIsoDay(iso) ?? new Date(0);
  return (isoWeekday(date) - firstDay + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

/** Column headers starting on `firstDay`, named in `locale`. */
export function weekdays(locale: string, firstDay: number): CalendarWeekday[] {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  // 2024-01-01 was a Monday (ISO weekday 1).
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
    const date = utc(2024, 0, ((firstDay - 1 + index) % DAYS_PER_WEEK) + 1);
    return { short: short.format(date), long: long.format(date) };
  });
}

/** "November 2026" in `locale`. */
export function monthTitle(month: string, locale: string): string {
  const date = parseIsoDay(month) ?? new Date(0);
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * The weeks shown for `month` (any day of it): whole weeks from the one holding the 1st to the one
 * holding the last day, starting on `firstDay`.
 */
export function monthWeeks(
  month: string,
  options: { locale: string; firstDay: number; today: string; min: string | null },
): CalendarDay[][] {
  const first = monthOf(month);
  const label = new Intl.DateTimeFormat(options.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const start = addDays(first, -weekOffset(first, options.firstDay));
  const next = addMonths(first, 1);
  const weeks: CalendarDay[][] = [];
  for (let cursor = start; cursor < next;) {
    const week: CalendarDay[] = [];
    for (let index = 0; index < DAYS_PER_WEEK; index++) {
      const date = parseIsoDay(cursor) ?? new Date(0);
      week.push({
        iso: cursor,
        day: date.getUTCDate(),
        label: label.format(date),
        outside: monthOf(cursor) !== first,
        today: cursor === options.today,
        disabled: options.min !== null && cursor < options.min,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
