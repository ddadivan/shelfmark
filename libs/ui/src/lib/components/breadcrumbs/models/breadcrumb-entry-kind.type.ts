import type { BREADCRUMB_ENTRY_KIND } from './breadcrumb-entry-kind.const';

export type BreadcrumbEntryKind =
  (typeof BREADCRUMB_ENTRY_KIND)[keyof typeof BREADCRUMB_ENTRY_KIND];
