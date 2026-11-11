import type { Params } from '@angular/router';
import {
  LINK_SORT_FIELD,
  normalizeTagName,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type ListLinksQuery,
  type SavedViewQuery,
  type SavedViewQueryRequest,
} from '@shelfmark/contracts';
import { APP_PATH } from '../../models/app-path.const';
import { FEED_SORT } from '../links/models/feed-sort.const';
import type { FeedSort } from '../links/models/feed-sort.type';
import type { LinksFilter } from '../links/models/links-filter.type';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { KIND_QUERY_PARAM } from '../links/models/kind-query-param.const';
import { SEARCH_QUERY_PARAM } from '../links/models/search-query-param.const';
import { SORT_QUERY_PARAM } from '../links/models/sort-query-param.const';
import { TAG_QUERY_PARAM } from '../tags/models/tag-query-param.const';
import type { ViewNavigation } from './models/view-navigation.interface';

/** The complete saved-view query of a feed filter: what "Save this view" stores. */
export function viewQueryOf(filter: LinksFilter): SavedViewQuery {
  return {
    scope: filter.scope,
    folderId: filter.scope === LINKS_SCOPE.Folder ? filter.folderId : null,
    tags: [...(filter.tags ?? [])],
    kind: filter.kind ?? null,
    sort: filter.sort ?? LINK_SORT_FIELD.CreatedAt,
    order: filter.order ?? SORT_ORDER.Desc,
    q: filter.q ?? '',
  };
}

/**
 * The stored form of a request, as the API normalizes it: defaults filled in, tag names
 * normalized and deduplicated (case-insensitively), the search trimmed. The mock API uses it.
 */
export function normalizeViewQuery(request: SavedViewQueryRequest): SavedViewQuery {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of request.tags ?? []) {
    const name = normalizeTagName(raw);
    if (name !== '' && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      tags.push(name);
    }
  }
  return {
    scope: request.scope,
    folderId: request.folderId ?? null,
    tags,
    kind: request.kind ?? null,
    sort: request.sort ?? LINK_SORT_FIELD.CreatedAt,
    order: request.order ?? SORT_ORDER.Desc,
    q: (request.q ?? '').trim(),
  };
}

function sameTags(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a.map((name) => name.toLowerCase()));
  const right = new Set(b.map((name) => name.toLowerCase()));
  return left.size === right.size && [...left].every((name) => right.has(name));
}

/** The view lists exactly what the filter lists (tags in any order and case, the same sort). */
export function sameViewQuery(query: SavedViewQuery, filter: LinksFilter): boolean {
  const current = viewQueryOf(filter);
  return (
    query.scope === current.scope &&
    (query.folderId ?? '').toLowerCase() === (current.folderId ?? '').toLowerCase() &&
    sameTags(query.tags, current.tags) &&
    query.kind === current.kind &&
    query.sort === current.sort &&
    query.order === current.order &&
    query.q.trim() === current.q.trim()
  );
}

/** All links, nothing narrowed (any sort): the fixed "All" chip is pressed. */
export function isAllFilter(filter: LinksFilter): boolean {
  return (
    filter.scope === LINKS_SCOPE.All &&
    (filter.tags ?? []).length === 0 &&
    !filter.q &&
    filter.kind === undefined
  );
}

/** The `GET /api/links` filters of a view (the mock counts with it). */
export function listQueryOf(query: SavedViewQuery): ListLinksQuery {
  const list: ListLinksQuery = {};
  if (query.scope === SAVED_VIEW_SCOPE.Unsorted) {
    list.unsorted = true;
  } else if (query.scope === SAVED_VIEW_SCOPE.Favorites) {
    list.favorite = true;
  } else if (query.scope === SAVED_VIEW_SCOPE.Folder && query.folderId !== null) {
    list.folderId = query.folderId;
  }
  if (query.tags.length > 0) {
    list.tag = [...query.tags];
  }
  if (query.kind !== null) {
    list.kind = query.kind;
  }
  if (query.q !== '') {
    list.q = query.q;
  }
  return list;
}

/** The feed sort of a view; a sort the feed has no option for falls back to newest first. */
function feedSortOf(query: SavedViewQuery): FeedSort {
  if (query.sort === LINK_SORT_FIELD.Title) {
    return FEED_SORT.Title;
  }
  return query.order === SORT_ORDER.Asc ? FEED_SORT.Oldest : FEED_SORT.Newest;
}

/** Where a view leads: the route of its scope and the query parameters of its filters. */
export function viewNavigation(query: SavedViewQuery): ViewNavigation {
  const commands: string[] =
    query.scope === SAVED_VIEW_SCOPE.Unsorted
      ? ['/', APP_PATH.Unsorted]
      : query.scope === SAVED_VIEW_SCOPE.Favorites
        ? ['/', APP_PATH.Favorites]
        : query.scope === SAVED_VIEW_SCOPE.Folder && query.folderId !== null
          ? ['/', APP_PATH.Folders, query.folderId]
          : ['/', APP_PATH.Links];
  const sort = feedSortOf(query);
  const queryParams: Params = {};
  if (query.tags.length > 0) {
    queryParams[TAG_QUERY_PARAM] = [...query.tags];
  }
  if (query.q !== '') {
    queryParams[SEARCH_QUERY_PARAM] = query.q;
  }
  if (query.kind !== null) {
    queryParams[KIND_QUERY_PARAM] = query.kind;
  }
  if (sort !== FEED_SORT.Newest) {
    queryParams[SORT_QUERY_PARAM] = sort;
  }
  return { commands, queryParams };
}
