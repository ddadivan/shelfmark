import { FEED_SORT } from '../../links/models/feed-sort.const';

/** Translation keys of the sort menu labels. */
export const SORT_OPTION_KEYS = {
  [FEED_SORT.Newest]: 'library.sort.newest',
  [FEED_SORT.Oldest]: 'library.sort.oldest',
  [FEED_SORT.Title]: 'library.sort.title',
} as const;
