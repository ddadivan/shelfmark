import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiTagInputHarness.with()`. */
export interface TagInputHarnessFilters extends BaseHarnessFilters {
  /** Text of the field label. */
  readonly label?: string | RegExp;
  readonly disabled?: boolean;
}
