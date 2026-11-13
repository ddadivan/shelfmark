import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Filters for `UiTreeItemHarness.with()`. */
export interface TreeItemHarnessFilters extends BaseHarnessFilters {
  /** The row's own name (not its count, not its children). */
  readonly name?: string | RegExp;
  /** Depth, 1 for top-level rows. */
  readonly level?: number;
  readonly expanded?: boolean;
  /** The current row (`aria-current`, set from `activeId`). */
  readonly current?: boolean;
  /** A folder row (`nodes`) rather than a fixed row (`fixedNodes`). */
  readonly folder?: boolean;
}
