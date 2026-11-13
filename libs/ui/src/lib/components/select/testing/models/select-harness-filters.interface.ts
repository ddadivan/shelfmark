import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiSelectHarness.with()`. */
export interface SelectHarnessFilters extends BaseHarnessFilters {
  /** Text of the field label. */
  readonly label?: string | RegExp;
  readonly disabled?: boolean;
}
