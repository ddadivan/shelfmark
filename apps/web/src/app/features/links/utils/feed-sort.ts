import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { FEED_SORT } from '../models/feed-sort.const';
import type { FeedSortQuery } from '../models/feed-sort-query.interface';
import type { FeedSort } from '../models/feed-sort.type';

/** The sort of `?sort=`; an absent, repeated or unknown value is `newest`. */
export function parseFeedSort(raw: unknown): FeedSort {
  return explicitFeedSort(raw) ?? FEED_SORT.Newest;
}

/** The sort a `?sort=` names, or `undefined` when it names none (absent, repeated or unknown). */
export function explicitFeedSort(raw: unknown): FeedSort | undefined {
  return Object.values(FEED_SORT).find((sort) => sort === raw);
}

/** The API's `sort` and `order` of a feed sort. */
export function feedSortQuery(sort: FeedSort): FeedSortQuery {
  switch (sort) {
    case FEED_SORT.Oldest:
      return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Asc };
    case FEED_SORT.Title:
      return { sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Asc };
    case FEED_SORT.TitleDesc:
      return { sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Desc };
    default:
      return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Desc };
  }
}
