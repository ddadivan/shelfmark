import type { BreadcrumbEntry } from './breadcrumb-entry.type';
import type { BreadcrumbItem } from './breadcrumb-item.interface';

/** The visible trail and the levels folded into the "…" menu (internal). */
export interface BreadcrumbTrail {
  readonly entries: readonly BreadcrumbEntry[];
  /** Levels folded into the "…" menu, in order. */
  readonly hidden: readonly BreadcrumbItem[];
}
