import type { BaseHarnessFilters } from '@angular/cdk/testing';

export interface SuggestionRowHarnessFilters extends BaseHarnessFilters {
  /** The row's accessible name ("Suggested tags"), text or pattern. */
  ariaLabel?: string | RegExp;
}
