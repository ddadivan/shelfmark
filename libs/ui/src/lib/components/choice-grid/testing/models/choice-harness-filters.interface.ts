import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiChoiceHarness.with()`. */
export interface ChoiceHarnessFilters extends BaseHarnessFilters {
  /** The option's label (its accessible name). */
  readonly label?: string | RegExp;
  readonly value?: string;
  readonly checked?: boolean;
}
