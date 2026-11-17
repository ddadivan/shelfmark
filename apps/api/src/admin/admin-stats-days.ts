import { utcDay } from '../users/user-activity.service';

const DAY_MS = 86_400_000;

/** `count` consecutive UTC days ending with the day of `now`, oldest first (`YYYY-MM-DD`). */
export function lastUtcDays(now: Date, count: number): string[] {
  const today = Date.parse(`${utcDay(now)}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    utcDay(new Date(today - (count - 1 - i) * DAY_MS)),
  );
}

/** The Mondays of the last `count` ISO weeks ending with the week of `now`, oldest first. */
export function lastUtcWeeks(now: Date, count: number): string[] {
  const today = Date.parse(`${utcDay(now)}T00:00:00Z`);
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY_MS;
  return Array.from({ length: count }, (_, i) =>
    utcDay(new Date(monday - (count - 1 - i) * 7 * DAY_MS)),
  );
}
