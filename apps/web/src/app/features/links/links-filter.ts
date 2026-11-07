import type { LinkResponse, ListLinksQuery } from '@shelfmark/contracts';
import type { LinksFilter } from './models/links-filter.type';
import { LINKS_SCOPE } from './models/links-scope.const';

/** The `GET /api/links` query of a filter, with an optional cursor. Empty `tags` and `q` are left out. */
export function linksQuery(filter: LinksFilter, cursor?: string): ListLinksQuery {
  const query: ListLinksQuery = cursor === undefined ? {} : { cursor };
  switch (filter.scope) {
    case LINKS_SCOPE.Unsorted:
      query.unsorted = true;
      break;
    case LINKS_SCOPE.Favorites:
      query.favorite = true;
      break;
    case LINKS_SCOPE.Folder:
      query.folderId = filter.folderId;
      break;
    default:
      break;
  }
  if (filter.tags && filter.tags.length > 0) {
    query.tag = [...filter.tags];
  }
  if (filter.q) {
    query.q = filter.q;
  }
  if (filter.sort !== undefined) {
    query.sort = filter.sort;
  }
  if (filter.order !== undefined) {
    query.order = filter.order;
  }
  return query;
}

/** Whether a link belongs in the feed of a filter (a link saved while the feed is open). */
export function inFilter(filter: LinksFilter, link: LinkResponse): boolean {
  switch (filter.scope) {
    case LINKS_SCOPE.Unsorted:
      if (link.folderId !== null) {
        return false;
      }
      break;
    case LINKS_SCOPE.Favorites:
      if (!link.isFavorite) {
        return false;
      }
      break;
    case LINKS_SCOPE.Folder:
      if (link.folderId !== filter.folderId) {
        return false;
      }
      break;
    default:
      break;
  }
  const names = link.tags.map((name) => name.toLowerCase());
  const tagsMatch = (filter.tags ?? []).every((tag) => names.includes(tag.toLowerCase()));
  const queryMatch = !filter.q || link.title.toLowerCase().includes(filter.q.toLowerCase());
  return tagsMatch && queryMatch;
}

/** Two filters list the same links (the same request). */
export function sameFilter(a: LinksFilter, b: LinksFilter): boolean {
  return a.scope === b.scope && JSON.stringify(linksQuery(a)) === JSON.stringify(linksQuery(b));
}
