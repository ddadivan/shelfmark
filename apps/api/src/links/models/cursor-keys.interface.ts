/** The sort key fields of a keyset cursor (see `LinkCursor`). */
export interface CursorKeys {
  /** Sort key of the last row; `null` only for a never-opened link in `lastOpenedAt` order. */
  k: string | null;
  /** Second key: the title for `host`, the creation time for `favorite`; absent otherwise. */
  k2?: string;
}
