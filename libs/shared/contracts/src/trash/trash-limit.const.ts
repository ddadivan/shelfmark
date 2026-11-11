/** `BatchMax`: items in one restore or delete-forever request. `ListMax`: newest entries `GET /api/trash` returns. */
export const TRASH_LIMIT = {
  BatchMax: 100,
  ListMax: 500,
} as const;
