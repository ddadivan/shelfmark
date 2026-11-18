/** `GET /api/links/:id/related` query: `limit` 1 to `AI_SEARCH_LIMIT.RelatedMax`, default `RelatedDefault`. */
export interface RelatedLinksQuery {
  limit?: number;
}
