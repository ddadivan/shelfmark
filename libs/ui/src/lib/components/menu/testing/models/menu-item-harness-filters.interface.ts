import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiMenuItemHarness.with()`. */
export interface MenuItemHarnessFilters extends BaseHarnessFilters {
  /** Label text of the item (without the shortcut hint). */
  readonly text?: string | RegExp;
  readonly disabled?: boolean;
}
