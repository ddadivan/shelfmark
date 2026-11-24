import type { AskTurn } from './ask-turn.interface';

/** `POST /api/ai/ask` body. */
export interface AskRequest {
  /**
   * The question: trimmed and whitespace collapsed by the server, `ASK_LIMIT.QuestionMin` to
   * `QuestionMax` characters, no control characters. Never logged; stored with its answer in the
   * user's Ask history while "Keep Ask history" is on (ADR 0055 amendment, 2026-11-24).
   */
  question: string;
  /**
   * Earlier turns of the open chat, oldest first, as the server sent them in `done.turn`; at most
   * `ASK_LIMIT.HistoryTurnsMax`. Used only when no stored conversation is continued
   * (`conversationId` absent or unknown, or history off); never logged.
   */
  history?: AskTurn[];
  /**
   * A stored conversation of the session user to continue: the server reads the earlier turns from
   * its own store (the client's `history` is then ignored) and appends this turn. Absent: a new
   * conversation is started (while "Keep Ask history" is on).
   */
  conversationId?: string;
}
