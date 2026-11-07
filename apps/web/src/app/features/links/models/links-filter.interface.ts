import type { LinkSortField, SortOrder } from '@shelfmark/contracts';
import type { LinksScope } from './links-scope.type';

/** What the feed is filtered by: the route scope plus the query parameters of the library page. */
export interface LinksFilter {
  readonly scope: LinksScope;
  /** The folder of `LINKS_SCOPE.Folder`; ignored by the other scopes. */
  readonly folderId?: string;
  /** Tag names; a link must have all of them. */
  readonly tags?: readonly string[];
  /** Title search. */
  readonly q?: string;
  readonly sort?: LinkSortField;
  readonly order?: SortOrder;
}
