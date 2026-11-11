/** Routes of public collections (#276). `:id` is a folder id, `:token` the public token. */
export const SHARE_ENDPOINT = {
  /** Owner: `GET` the state, `POST` enable, `PATCH` settings, `DELETE` disable. */
  Folder: '/api/folders/:id/share',
  /** Owner: `POST` replaces the token; the old link stops working at once. */
  Reset: '/api/folders/:id/share/reset',
  /** Anyone with the link: the read-only collection page data. */
  PublicCollection: '/api/public/collections/:token',
  /** Anyone with the link: the stored favicon of a link in the shared subtree. */
  PublicFavicon: '/api/public/collections/:token/links/:linkId/favicon',
  /** Anyone with the link: the stored preview image of a link in the shared subtree. */
  PublicImage: '/api/public/collections/:token/links/:linkId/image',
} as const;
