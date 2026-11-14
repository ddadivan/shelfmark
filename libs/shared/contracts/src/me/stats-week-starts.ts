import { ME_STATS_FIRST_DAY } from './me-stats-first-day.const';
import { ME_STATS_LIMIT } from './me-stats-limit.const';

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;

/**
 * The first days (UTC, `YYYY-MM-DD`) of the `ME_STATS_LIMIT.Weeks` weeks of
 * `MeStatsResponse.weeklyLinks`, oldest first, the week of `now` last. A week starts on the ISO
 * weekday `firstDay` (1 Monday … 7 Sunday, `ME_STATS_FIRST_DAY`); the API buckets its links with
 * the same rule, so the API and the web mock agree.
 */
export function statsWeekStarts(
  now: Date,
  firstDay: number = ME_STATS_FIRST_DAY.Default,
): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // getUTCDay: Sunday 0 … Saturday 6, so `|| 7` gives the ISO weekday.
  const isoDay = new Date(today).getUTCDay() || DAYS_PER_WEEK;
  const sinceStart = (isoDay - firstDay + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const thisStart = today - sinceStart * DAY_MS;
  return Array.from({ length: ME_STATS_LIMIT.Weeks }, (_, index) =>
    new Date(thisStart - (ME_STATS_LIMIT.Weeks - 1 - index) * DAYS_PER_WEEK * DAY_MS)
      .toISOString()
      .slice(0, 10),
  );
}
