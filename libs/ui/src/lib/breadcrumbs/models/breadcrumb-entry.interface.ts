import type { BreadcrumbItem } from './breadcrumb-item.interface';
import type { BreadcrumbEntryKind } from './breadcrumb-entry-kind.type';

/** One rendered slot of the trail (internal). */
export interface BreadcrumbEntry {
  readonly key: string;
  readonly kind: BreadcrumbEntryKind;
  /** The level shown; unset for the collapsed slot. */
  readonly item?: BreadcrumbItem;
}
