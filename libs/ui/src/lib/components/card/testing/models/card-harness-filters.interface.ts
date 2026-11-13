import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiCardHarness.with()`. */
export interface CardHarnessFilters extends BaseHarnessFilters {
  /** Text of the title (`slot="title"`), the name of the card's link or button. */
  readonly title?: string | RegExp;
  readonly selected?: boolean;
}
