import type { WeekBar } from './week-bar.interface';

/** A `WeekBar` with its date written out in the active language. */
export interface WeekBarView extends WeekBar {
  /** "Nov 9" */
  readonly label: string;
}
