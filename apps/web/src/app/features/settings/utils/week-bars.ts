import type { MeStatsWeek } from '@shelfmark/contracts';
import type { WeekBar } from '../models/week-bar.interface';

/** The weeks of `MeStatsResponse.weeklyLinks` as bars scaled to the tallest week. */
export function weekBars(weeks: readonly MeStatsWeek[]): WeekBar[] {
  const max = Math.max(0, ...weeks.map((week) => week.count));
  return weeks.map((week) => ({
    weekStart: week.weekStart,
    count: week.count,
    percent: max === 0 ? 0 : Math.round((week.count / max) * 100),
  }));
}
