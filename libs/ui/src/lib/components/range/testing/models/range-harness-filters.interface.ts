import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiRangeHarness.with()`. */
export interface RangeHarnessFilters extends BaseHarnessFilters {
  /** The accessible name of the slider. */
  readonly label?: string | RegExp;
}
