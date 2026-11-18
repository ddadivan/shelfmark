const MS_PER_DAY = 86_400_000;

/** The ISO week of `now` in UTC, `YYYY-Www` (weeks start on Monday; week 1 holds the first Thursday). */
export function isoWeek(now: Date): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
  // The Thursday of this week decides the year.
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const year = day.getUTCFullYear();
  const week = Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / MS_PER_DAY + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
