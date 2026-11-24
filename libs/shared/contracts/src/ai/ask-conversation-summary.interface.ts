/** One row of the Ask conversation list (`GET /api/ai/ask/conversations`). */
export interface AskConversationSummary {
  /** Conversation UUID. */
  id: string;
  /** The first question of the conversation, at most `ASK_HISTORY_LIMIT.TitleMaxChars`. */
  title: string;
  /** How many turns are stored. */
  turns: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601: the last stored turn (the list is ordered by it, newest first). */
  updatedAt: string;
}
