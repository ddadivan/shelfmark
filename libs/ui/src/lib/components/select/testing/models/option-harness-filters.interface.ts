import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiOptionHarness.with()`. */
export interface OptionHarnessFilters extends BaseHarnessFilters {
  /** Visible text of the option. */
  readonly text?: string | RegExp;
  /** Accessible name: `aria-label` when set (a nested select row's path, a tag with its count), else the text. */
  readonly name?: string | RegExp;
  readonly disabled?: boolean;
}
