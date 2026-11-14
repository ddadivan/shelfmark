/** One bar of the "Links added per week" chart on the Account page (#352). */
export interface WeekBar {
  /** First day of the week (the user's week start), UTC, `YYYY-MM-DD`. */
  readonly weekStart: string;
  readonly count: number;
  /** Bar height in percent of the tallest week (0 for an empty week). */
  readonly percent: number;
}
