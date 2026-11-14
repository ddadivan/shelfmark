import type { BaseHarnessFilters } from '@angular/cdk/testing';

export interface BarChartHarnessFilters extends BaseHarnessFilters {
  /** The chart's accessible name (`label`), text or pattern. */
  label?: string | RegExp;
}
