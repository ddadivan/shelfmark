/** `GET /api/ai/ask/conversations` query. */
export interface AskConversationListQuery {
  /** The `nextCursor` of the previous page. */
  cursor?: string;
  /** 1 to `ASK_HISTORY_LIMIT.PageMax`, default `PageSize`. */
  limit?: number;
}
