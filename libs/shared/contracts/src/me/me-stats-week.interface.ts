/** Links added in one week (`MeStatsResponse.weeklyLinks`). */
export interface MeStatsWeek {
  /** The first day of the week (`MeStatsQuery.firstDay`, Monday by default), UTC, `YYYY-MM-DD`. */
  weekStart: string;
  /** Live links (not in Trash) created in that week. */
  count: number;
}
