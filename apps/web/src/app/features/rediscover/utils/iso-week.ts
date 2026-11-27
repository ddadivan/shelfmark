import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
/** The ISO week of `now` in UTC (`2026-W47`), weeks starting on Monday. */
export function isoWeek(now: number): string {
  const date = new Date(now);
  const day = date.getUTCDay() || 7;
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 4 - day),
  );
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / MS_PER_DAY + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
