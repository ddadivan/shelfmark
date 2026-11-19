import type { BaseHarnessFilters } from '@angular/cdk/testing';

export interface PopoverHarnessFilters extends BaseHarnessFilters {
  /** The heading (the dialog's accessible name). */
  readonly heading?: string | RegExp;
}
