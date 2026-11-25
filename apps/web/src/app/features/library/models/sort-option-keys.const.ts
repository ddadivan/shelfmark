import { FEED_SORT } from '../../links/models/feed-sort.const';

/** Translation keys of the sort menu labels. */
export const SORT_OPTION_KEYS = {
  [FEED_SORT.Newest]: 'library.sort.newest',
  [FEED_SORT.Oldest]: 'library.sort.oldest',
  [FEED_SORT.Opened]: 'library.sort.opened',
  [FEED_SORT.Edited]: 'library.sort.edited',
  [FEED_SORT.Title]: 'library.sort.title',
  [FEED_SORT.TitleDesc]: 'library.sort.titleDesc',
  [FEED_SORT.Site]: 'library.sort.site',
  [FEED_SORT.Favorites]: 'library.sort.favorites',
} as const;
