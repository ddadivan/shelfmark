import type { Params } from '@angular/router';
import type { AskSearchFilter } from '@shelfmark/contracts';
import { APP_PATH } from '../../../models/app-path.const';
import { KIND_QUERY_PARAM } from '../../links/models/kind-query-param.const';
import { SEARCH_QUERY_PARAM } from '../../links/models/search-query-param.const';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';
import type { ViewNavigation } from '../../views/models/view-navigation.interface';

/**
 * Where "Show all N in search" leads (ADR 0055): the feed of the search's folder (or Favorites, else
 * All links) with its words, tags and kind as the feed's query parameters.
 */
export function askSearchNavigation(filter: AskSearchFilter): ViewNavigation {
  const commands =
    filter.folderId !== null
      ? ['/', APP_PATH.Folders, filter.folderId]
      : filter.favorite
        ? ['/', APP_PATH.Favorites]
        : ['/', APP_PATH.Links];
  const queryParams: Params = {};
  if (filter.q !== null && filter.q !== '') {
    queryParams[SEARCH_QUERY_PARAM] = filter.q;
  }
  if (filter.tags.length > 0) {
    queryParams[TAG_QUERY_PARAM] = [...filter.tags];
  }
  if (filter.kind !== null) {
    queryParams[KIND_QUERY_PARAM] = filter.kind;
  }
  return { commands, queryParams };
}
