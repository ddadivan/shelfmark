/** Query parameters shared by cursor-paginated lists. Numbers arrive as strings and are coerced by the API. */
export interface CursorQuery {
  cursor?: string;
  /** Defaults to `PAGE_LIMIT.Default`, at most `PAGE_LIMIT.Max`. */
  limit?: number;
}
