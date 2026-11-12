import {
  LINK_SORT_FIELD,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  type ListSavedViewsQuery,
  type SavedViewQueryRequest,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { APP_PATH } from '../../../models/app-path.const';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';
import type { ViewNavigation } from '../models/view-navigation.interface';
import { viewNavigation } from './saved-view-query';

/*
 * The saved view chips on every feed (#335). The feed is the route (All links, Unsorted,
 * Favorites, a folder) plus the tags in the address that no view owns. Counts are taken inside the
 * feed; "All" is the feed itself; a view whose scope is "all" (a plain filter: type, search, tags)
 * applies inside whatever feed it is opened on; a view tied to a place (Unsorted, Favorites, a
 * folder) is offered on All links, where it leads to its place, and on its own place.
 */

const lower = (names: readonly string[]): string[] => names.map((name) => name.toLowerCase());

function sameSort(view: SavedViewResponse, filter: LinksFilter): boolean {
  return (
    view.query.sort === (filter.sort ?? LINK_SORT_FIELD.CreatedAt) &&
    view.query.order === (filter.order ?? SORT_ORDER.Desc)
  );
}

/** Whether the view is offered on this feed. */
export function viewOnFeed(view: SavedViewResponse, filter: LinksFilter): boolean {
  if (filter.scope === LINKS_SCOPE.All || view.query.scope === SAVED_VIEW_SCOPE.All) {
    return true;
  }
  return (
    view.query.scope === filter.scope &&
    (filter.scope !== LINKS_SCOPE.Folder || view.query.folderId === filter.folderId)
  );
}

/**
 * The view that is on now: it is offered here, has the filter's type and search, its tags are
 * among the filter's and the sort is the same. The one with most tags wins.
 */
export function activeViewOf(
  filter: LinksFilter,
  views: readonly SavedViewResponse[],
): SavedViewResponse | null {
  const have = new Set(lower(filter.tags ?? []));
  let best: SavedViewResponse | null = null;
  for (const view of views) {
    if (
      viewOnFeed(view, filter) &&
      (view.query.kind ?? null) === (filter.kind ?? null) &&
      view.query.q.trim() === (filter.q ?? '').trim() &&
      sameSort(view, filter) &&
      lower(view.query.tags).every((name) => have.has(name)) &&
      (view.query.scope === SAVED_VIEW_SCOPE.All || view.query.scope === filter.scope) &&
      (best === null || view.query.tags.length > best.query.tags.length)
    ) {
      best = view;
    }
  }
  return best;
}

/** The tags of the address that belong to the feed (the active view's own tags do not). */
export function feedTagsOf(filter: LinksFilter, views: readonly SavedViewResponse[]): string[] {
  const own = new Set(lower(activeViewOf(filter, views)?.query.tags ?? []));
  return (filter.tags ?? []).filter((name) => !own.has(name.toLowerCase()));
}

/** The feed to count in; none for plain All links (the whole library). */
export function feedQueryOf(
  filter: LinksFilter,
  views: readonly SavedViewResponse[],
): ListSavedViewsQuery | undefined {
  const tag = feedTagsOf(filter, views);
  if (filter.scope === LINKS_SCOPE.All && tag.length === 0) {
    return undefined;
  }
  return {
    scope: filter.scope,
    ...(filter.scope === LINKS_SCOPE.Folder ? { folderId: filter.folderId } : {}),
    ...(tag.length > 0 ? { tag } : {}),
  };
}

function feedCommands(filter: LinksFilter): string[] {
  switch (filter.scope) {
    case LINKS_SCOPE.Unsorted:
      return ['/', APP_PATH.Unsorted];
    case LINKS_SCOPE.Favorites:
      return ['/', APP_PATH.Favorites];
    case LINKS_SCOPE.Folder:
      return ['/', APP_PATH.Folders, filter.folderId];
    default:
      return ['/', APP_PATH.Links];
  }
}

/** "All": the feed with no type and no search, its own tags kept. */
export function feedAllNavigation(
  filter: LinksFilter,
  views: readonly SavedViewResponse[],
): ViewNavigation {
  const tags = feedTagsOf(filter, views);
  return {
    commands: feedCommands(filter),
    queryParams: tags.length > 0 ? { [TAG_QUERY_PARAM]: tags } : {},
  };
}

/**
 * Where a view leads from this feed: a view tied to a place leads to that place from All links;
 * a plain view stays on the feed. The feed's tags and the view's tags are both kept.
 */
export function viewNavigationOnFeed(
  view: SavedViewResponse,
  filter: LinksFilter,
  views: readonly SavedViewResponse[],
): ViewNavigation {
  const feedTags = feedTagsOf(filter, views);
  if (filter.scope === LINKS_SCOPE.All && view.query.scope !== SAVED_VIEW_SCOPE.All) {
    const own = viewNavigation(view.query);
    return withTags(own, feedTags, view.query.tags);
  }
  const own = viewNavigation({ ...view.query, scope: SAVED_VIEW_SCOPE.All, folderId: null });
  return withTags({ ...own, commands: feedCommands(filter) }, feedTags, view.query.tags);
}

function withTags(
  navigation: ViewNavigation,
  feedTags: readonly string[],
  viewTags: readonly string[],
): ViewNavigation {
  const seen = new Set<string>();
  const tags = [...feedTags, ...viewTags].filter((name) => {
    const key = name.toLowerCase();
    return seen.has(key) ? false : (seen.add(key), true);
  });
  const queryParams = { ...navigation.queryParams };
  if (tags.length > 0) {
    queryParams[TAG_QUERY_PARAM] = tags;
  } else {
    delete queryParams[TAG_QUERY_PARAM];
  }
  return { commands: navigation.commands, queryParams };
}

/**
 * What "+ Save this view" stores. On All links the whole filter (as before). On any other feed
 * only the type: a plain view (scope all, no tags, no search, newest first) that works on every
 * feed, so a view saved in a folder is not tied to that folder.
 */
export function savedQueryOf(
  filter: LinksFilter,
  whole: SavedViewQueryRequest,
): SavedViewQueryRequest {
  return filter.scope === LINKS_SCOPE.All
    ? whole
    : { scope: SAVED_VIEW_SCOPE.All, kind: filter.kind ?? null };
}
