import type { BREADCRUMB_ENTRY_KIND } from './breadcrumb-entry-kind.const';
import type { BreadcrumbItem } from './breadcrumb-item.interface';

/** A rendered level: a link (or button without `href`) or the current page (internal). */
export interface BreadcrumbLevelEntry {
  readonly key: string;
  readonly kind: typeof BREADCRUMB_ENTRY_KIND.Link | typeof BREADCRUMB_ENTRY_KIND.Current;
  readonly item: BreadcrumbItem;
}
