import { ME_STATS_LIMIT } from './me-stats-limit.const';

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;

/**
 * The Mondays (UTC, `YYYY-MM-DD`) that start the `ME_STATS_LIMIT.Weeks` weeks of
 * `MeStatsResponse.weeklyLinks`, oldest first, the week of `now` last. Postgres
 * `date_trunc('week', …)` starts weeks on Monday too, so the API and the web mock agree.
 */
export function statsWeekStarts(now: Date): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // getUTCDay: Sunday 0 … Saturday 6; days since Monday.
  const sinceMonday = (new Date(today).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const thisMonday = today - sinceMonday * DAY_MS;
  return Array.from({ length: ME_STATS_LIMIT.Weeks }, (_, index) =>
    new Date(thisMonday - (ME_STATS_LIMIT.Weeks - 1 - index) * DAYS_PER_WEEK * DAY_MS)
      .toISOString()
      .slice(0, 10),
  );
}
