import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { FEED_SORT } from './models/feed-sort.const';
import type { FeedSortQuery } from './models/feed-sort-query.interface';
import type { FeedSort } from './models/feed-sort.type';

/** The sort of `?sort=`; an absent, repeated or unknown value is `newest`. */
export function parseFeedSort(raw: unknown): FeedSort {
  return raw === FEED_SORT.Oldest || raw === FEED_SORT.Title ? raw : FEED_SORT.Newest;
}

/** The API's `sort` and `order` of a feed sort. */
export function feedSortQuery(sort: FeedSort): FeedSortQuery {
  switch (sort) {
    case FEED_SORT.Oldest:
      return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Asc };
    case FEED_SORT.Title:
      return { sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Asc };
    default:
      return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Desc };
  }
}
