/** One day button of the calendar grid. */
export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  iso: string;
  /** Day of the month. */
  day: number;
  /** Full date for the accessible name ("Saturday, 14 November 2026"). */
  label: string;
  /** Belongs to the month before or after the one shown. */
  outside: boolean;
  today: boolean;
  /** Before `min`, so it cannot be picked. */
  disabled: boolean;
}
