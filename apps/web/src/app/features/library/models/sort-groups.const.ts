import { FEED_SORT } from '../../links/models/feed-sort.const';

/** The sort menu under its headings: Date, Name, then Favorites first without a heading. */
export const SORT_GROUPS = [
  {
    labelKey: 'library.sort.groupDate',
    options: [FEED_SORT.Newest, FEED_SORT.Oldest, FEED_SORT.Opened, FEED_SORT.Edited],
  },
  {
    labelKey: 'library.sort.groupName',
    options: [FEED_SORT.Title, FEED_SORT.TitleDesc, FEED_SORT.Site],
  },
  { labelKey: null, options: [FEED_SORT.Favorites] },
] as const;
