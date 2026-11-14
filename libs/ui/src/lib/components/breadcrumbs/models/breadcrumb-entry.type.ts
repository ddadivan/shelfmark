import type { BreadcrumbCollapsedEntry } from './breadcrumb-collapsed-entry.interface';
import type { BreadcrumbLevelEntry } from './breadcrumb-level-entry.interface';

/** One rendered slot of the trail (internal). */
export type BreadcrumbEntry = BreadcrumbLevelEntry | BreadcrumbCollapsedEntry;
