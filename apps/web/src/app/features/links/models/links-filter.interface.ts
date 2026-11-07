import type { LinksScope } from './links-scope.type';

/** What the feed is filtered by. Search and tags join it with their issues. */
export interface LinksFilter {
  readonly scope: LinksScope;
}
