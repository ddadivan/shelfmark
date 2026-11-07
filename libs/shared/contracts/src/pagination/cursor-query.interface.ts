/** Query parameters shared by cursor-paginated lists. The handler sees the parsed values (numbers, not strings). */
export interface CursorQuery {
  /** Opaque cursor from `CursorPage.nextCursor`, at most `PAGE_LIMIT.CursorMax` characters. */
  cursor?: string;
  /** Integer from 1 to `PAGE_LIMIT.Max`; defaults to `PAGE_LIMIT.Default`. */
  limit?: number;
}
