import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiTreeHarness.with()`. */
export interface TreeHarnessFilters extends BaseHarnessFilters {
  /** Accessible name of the tree (`ariaLabel`). */
  readonly label?: string | RegExp;
}
