import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiDialogHarness.with()`. */
export interface DialogHarnessFilters extends BaseHarnessFilters {
  /** Text of the dialog title (also the accessible name). */
  readonly title?: string | RegExp;
}
