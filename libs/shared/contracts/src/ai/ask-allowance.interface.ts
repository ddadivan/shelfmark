import type { AskPeriod } from './ask-period.type';

/** Questions the user can still ask, by the closer of the two limits. */
export interface AskAllowance {
  /** Questions left in `period` (0 = limit reached). */
  questionsLeft: number;
  /** The limit that is closer: the UTC day or the UTC month. */
  period: AskPeriod;
  /** ISO date (`YYYY-MM-DD`, UTC) when `period` resets: tomorrow or the first of next month. */
  resetsOn: string;
}
