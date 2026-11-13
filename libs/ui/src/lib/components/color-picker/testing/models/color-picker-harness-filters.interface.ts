import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiColorPickerHarness.with()`. */
export interface ColorPickerHarnessFilters extends BaseHarnessFilters {
  /** Accessible name of the swatch button (`label`). */
  readonly label?: string | RegExp;
}
