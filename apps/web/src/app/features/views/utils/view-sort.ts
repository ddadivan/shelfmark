import { LINK_SORT_FIELD, SORT_ORDER, type SavedViewQuery } from '@shelfmark/contracts';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import type { FeedSort } from '../../links/models/feed-sort.type';
import { feedSortQuery } from '../../links/utils/feed-sort';

/** The feed sort of a view; a sort the feed has no option for falls back to newest first. */
export function feedSortOf(query: Pick<SavedViewQuery, 'sort' | 'order'>): FeedSort {
  switch (query.sort) {
    case LINK_SORT_FIELD.Title:
      return query.order === SORT_ORDER.Desc ? FEED_SORT.TitleDesc : FEED_SORT.Title;
    case LINK_SORT_FIELD.LastOpenedAt:
      return FEED_SORT.Opened;
    case LINK_SORT_FIELD.UpdatedAt:
      return FEED_SORT.Edited;
    case LINK_SORT_FIELD.Host:
      return FEED_SORT.Site;
    case LINK_SORT_FIELD.Favorite:
      return FEED_SORT.Favorites;
    default:
      return query.order === SORT_ORDER.Asc ? FEED_SORT.Oldest : FEED_SORT.Newest;
  }
}

/** The stored sort of a feed sort (`FEED_SORT` value); anything else reads as newest first. */
export function sortFieldsOf(sort: string): Pick<SavedViewQuery, 'sort' | 'order'> {
  const known = Object.values(FEED_SORT).find((value) => value === sort);
  return feedSortQuery(known ?? FEED_SORT.Newest);
}
