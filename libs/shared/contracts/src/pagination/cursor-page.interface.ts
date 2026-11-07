/** One page of a cursor-paginated list. */
export interface CursorPage<T> {
  items: T[];
  /** Opaque cursor for the next page; `null` on the last page. */
  nextCursor: string | null;
}
