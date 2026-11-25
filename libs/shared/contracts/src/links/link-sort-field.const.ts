/**
 * The fields `GET /api/links` can order by. `lastOpenedAt` keeps never-opened links last in both
 * directions; `host` is the site (see `linkSiteKey`), ties by title; `updatedAt` moves when the
 * link is edited (title, note, URL, tags, folder, favorite); `favorite` puts favourites first
 * (`desc`), ties newest first.
 */
export const LINK_SORT_FIELD = {
  CreatedAt: 'createdAt',
  Title: 'title',
  LastOpenedAt: 'lastOpenedAt',
  Host: 'host',
  UpdatedAt: 'updatedAt',
  Favorite: 'favorite',
} as const;
