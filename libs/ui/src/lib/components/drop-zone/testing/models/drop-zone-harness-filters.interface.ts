import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiDropZoneHarness.with()`. */
export interface DropZoneHarnessFilters extends BaseHarnessFilters {
  /** The text before the action. */
  readonly label?: string | RegExp;
  /** The text of the picker button. */
  readonly actionLabel?: string | RegExp;
  readonly disabled?: boolean;
}
