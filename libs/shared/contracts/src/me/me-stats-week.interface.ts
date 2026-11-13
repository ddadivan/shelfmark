/** Links added in one week (`MeStatsResponse.weeklyLinks`). */
export interface MeStatsWeek {
  /** The Monday that starts the week, UTC, `YYYY-MM-DD`. */
  weekStart: string;
  /** Live links (not in Trash) created in that week. */
  count: number;
}
