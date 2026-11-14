import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiPickerMenuHarness.with()`. */
export interface PickerMenuHarnessFilters extends BaseHarnessFilters {
  /** The visible name on the trigger. */
  readonly label?: string | RegExp;
}
