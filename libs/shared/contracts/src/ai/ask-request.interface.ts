import type { AskTurn } from './ask-turn.interface';

/** `POST /api/ai/ask` body. */
export interface AskRequest {
  /**
   * The question: trimmed and whitespace collapsed by the server, `ASK_LIMIT.QuestionMin` to
   * `QuestionMax` characters, no control characters. Never stored or logged.
   */
  question: string;
  /**
   * Earlier turns of the open chat, oldest first, as the server sent them in `done.turn`; at most
   * `ASK_LIMIT.HistoryTurnsMax`. Kept in the browser's memory only; never stored or logged.
   */
  history?: AskTurn[];
}
