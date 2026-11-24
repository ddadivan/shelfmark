/**
 * Ask history (ADR 0055 amendment, 2026-11-24): conversations are kept on the server for
 * `RetentionDays` after their last turn, at most `ConversationsMax` per user (the oldest by last
 * turn are dropped) and `TurnsPerConversationMax` turns each (the oldest turns are dropped). The
 * title is the first question, cut to `TitleMaxChars`. The list is paged by `PageSize` (at most
 * `PageMax`).
 */
export const ASK_HISTORY_LIMIT = {
  ConversationsMax: 50,
  RetentionDays: 30,
  TurnsPerConversationMax: 50,
  TitleMaxChars: 120,
  PageSize: 20,
  PageMax: 50,
} as const;
