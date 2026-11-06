import type { BreadcrumbItem } from './breadcrumb-item.interface';

/** A level of `ui-breadcrumbs` was chosen. */
export interface BreadcrumbClick {
  readonly item: BreadcrumbItem;
  /**
   * Plain left click on a visible link: call `preventDefault()` to route instead of navigating.
   * `null` when the level was chosen from the collapsed "…" menu (no native navigation).
   */
  readonly event: MouseEvent | null;
}
