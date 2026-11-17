/**
 * `GET /api/ai/search` query: `q` is trimmed and collapsed, `AI_SEARCH_LIMIT.QueryMinChars` to
 * `QueryMax` characters; `limit` 1 to `MeaningMax`, default `MeaningDefault`.
 */
export interface MeaningSearchQuery {
  q: string;
  limit?: number;
}
