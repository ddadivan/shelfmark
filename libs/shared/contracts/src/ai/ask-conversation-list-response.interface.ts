import type { AskConversationSummary } from './ask-conversation-summary.interface';

/** `GET /api/ai/ask/conversations` answer: newest first. */
export interface AskConversationListResponse {
  items: AskConversationSummary[];
  /** Pass as `cursor` for the next page; `null` on the last page. */
  nextCursor: string | null;
}
