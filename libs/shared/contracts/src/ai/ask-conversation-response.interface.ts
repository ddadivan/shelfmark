import type { AskConversationTurn } from './ask-conversation-turn.interface';

/** `GET /api/ai/ask/conversations/:id` answer: the turns oldest first. */
export interface AskConversationResponse {
  id: string;
  title: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
  turns: AskConversationTurn[];
}
