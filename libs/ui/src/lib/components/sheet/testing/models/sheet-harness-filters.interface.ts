import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiSheetHarness.with()`. */
export interface SheetHarnessFilters extends BaseHarnessFilters {
  /** Text of the sheet title. */
  readonly title?: string | RegExp;
}
