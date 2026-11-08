import { FEED_SORT } from '../../links/models/feed-sort.const';

/** The sorts of the menu, in display order. */
export const SORT_OPTIONS = [FEED_SORT.Newest, FEED_SORT.Oldest, FEED_SORT.Title] as const;
