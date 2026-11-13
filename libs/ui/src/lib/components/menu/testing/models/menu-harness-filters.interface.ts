import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiMenuHarness.with()`. */
export interface MenuHarnessFilters extends BaseHarnessFilters {
  /** Accessible name of the menu (`ariaLabel`). */
  readonly label?: string | RegExp;
}
