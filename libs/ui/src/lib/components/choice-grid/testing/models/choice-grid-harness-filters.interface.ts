import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiChoiceGridHarness.with()`. */
export interface ChoiceGridHarnessFilters extends BaseHarnessFilters {
  /** Accessible name of the group (`ariaLabel`). */
  readonly label?: string | RegExp;
}
