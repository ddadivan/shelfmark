import type { BaseHarnessFilters } from '@angular/cdk/testing';

export interface SuggestionHarnessFilters extends BaseHarnessFilters {
  /** The visible tag or folder name, text or pattern. */
  label?: string | RegExp;
}
