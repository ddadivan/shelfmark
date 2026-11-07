/** `GET /api/links/recent` query. */
export interface RecentLinksQuery {
  /** Defaults to `PAGE_LIMIT.Default`, at most `PAGE_LIMIT.Max`. */
  limit?: number;
}
