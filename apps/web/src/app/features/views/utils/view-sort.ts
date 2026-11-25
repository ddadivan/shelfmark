import { LINK_SORT_FIELD, SORT_ORDER, type SavedViewQuery } from '@shelfmark/contracts';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import type { FeedSort } from '../../links/models/feed-sort.type';

/** The feed sort of a view; a sort the feed has no option for falls back to newest first. */
export function feedSortOf(query: Pick<SavedViewQuery, 'sort' | 'order'>): FeedSort {
  if (query.sort === LINK_SORT_FIELD.Title) {
    return query.order === SORT_ORDER.Desc ? FEED_SORT.TitleDesc : FEED_SORT.Title;
  }
  return query.order === SORT_ORDER.Asc ? FEED_SORT.Oldest : FEED_SORT.Newest;
}

/** The stored sort of a feed sort (`FEED_SORT` value); anything else reads as newest first. */
export function sortFieldsOf(sort: string): Pick<SavedViewQuery, 'sort' | 'order'> {
  if (sort === FEED_SORT.Title || sort === FEED_SORT.TitleDesc) {
    return {
      sort: LINK_SORT_FIELD.Title,
      order: sort === FEED_SORT.Title ? SORT_ORDER.Asc : SORT_ORDER.Desc,
    };
  }
  return {
    sort: LINK_SORT_FIELD.CreatedAt,
    order: sort === FEED_SORT.Oldest ? SORT_ORDER.Asc : SORT_ORDER.Desc,
  };
}
