import type { AskTurnLink } from './ask-turn-link.interface';

/**
 * One finished turn of an Ask chat (ADR 0055 point 6): produced by the server as `done.turn`, kept
 * by the web for the open chat and sent back in `AskRequest.history` when no stored conversation is
 * continued; the server stores the same shape in the Ask history (links by id only).
 */
export interface AskTurn {
  /** The question as the server normalised it (`ASK_LIMIT.QuestionMin` to `QuestionMax`). */
  question: string;
  /** The answer text with its `[n]` markers, at most `ASK_LIMIT.AnswerMaxChars`. */
  answer: string;
  /** Cited and shown links of the turn, at most `ASK_LIMIT.LinksPerTurnMax`. */
  links: AskTurnLink[];
}
