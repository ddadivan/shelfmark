/** Trash routes the web calls (PROJECT.md 6.2). */
export const TRASH_ENDPOINT = {
  /** `GET` lists Trash, `DELETE` empties it. */
  Base: '/api/trash',
  /** `POST` `TrashItemsRequest`: puts the items back. */
  Restore: '/api/trash/restore',
  /** `POST` `TrashItemsRequest`: deletes the items for good. */
  Delete: '/api/trash/delete',
} as const;
