import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiCommandListHarness.with()`. */
export interface CommandListHarnessFilters extends BaseHarnessFilters {
  /** Accessible name of the search input (`inputLabel`). */
  readonly label?: string | RegExp;
}
