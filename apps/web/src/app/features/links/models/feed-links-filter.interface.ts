import type { LINKS_SCOPE } from './links-scope.const';
import type { LinksFilterOptions } from './links-filter-options.interface';
import type { LinksScope } from './links-scope.type';

/** A scope without a folder: all links, unsorted or favorites. */
export interface FeedLinksFilter extends LinksFilterOptions {
  readonly scope: Exclude<LinksScope, typeof LINKS_SCOPE.Folder>;
}
