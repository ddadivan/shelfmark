/** One bar of the "Links added per week" chart on the Account page (#352). */
export interface WeekBar {
  /** Monday of the week, UTC, `YYYY-MM-DD`. */
  readonly weekStart: string;
  readonly count: number;
  /** Bar height in percent of the tallest week (0 for an empty week). */
  readonly percent: number;
}
