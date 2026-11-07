import type { BREADCRUMB_ENTRY_KIND } from './breadcrumb-entry-kind.const';

/** The "…" slot (internal). */
export interface BreadcrumbCollapsedEntry {
  readonly key: string;
  readonly kind: typeof BREADCRUMB_ENTRY_KIND.Collapsed;
}
