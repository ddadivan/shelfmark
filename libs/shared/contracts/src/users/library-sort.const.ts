/**
 * Settings › Library › Sort links by: the sort a feed starts with. Each folder remembers its own
 * choice (on the device) after the person changes it. The same values as the feed's `?sort=`.
 * `Opened` = recently opened (never opened last), `Site` = site A–Z, `Edited` = recently edited,
 * `Favorites` = favourites first, then newest.
 */
export const LIBRARY_SORT = {
  Newest: 'newest',
  Oldest: 'oldest',
  Opened: 'opened',
  Edited: 'edited',
  Title: 'title',
  TitleDesc: 'titleDesc',
  Site: 'site',
  Favorites: 'favorites',
} as const;
