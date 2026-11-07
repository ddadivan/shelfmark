import type { FeedLinksFilter } from './feed-links-filter.interface';
import type { FolderLinksFilter } from './folder-links-filter.interface';

/** What the feed is filtered by: the route scope plus the query parameters. A folder scope carries its folder. */
export type LinksFilter = FeedLinksFilter | FolderLinksFilter;
