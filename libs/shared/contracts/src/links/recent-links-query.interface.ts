/** `GET /api/links/recent` query. */
export interface RecentLinksQuery {
  /** Integer from 1 to `PAGE_LIMIT.Max`; defaults to `PAGE_LIMIT.Default`. */
  limit?: number;
}
