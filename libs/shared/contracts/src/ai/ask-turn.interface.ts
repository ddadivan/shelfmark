import type { AskTurnLink } from './ask-turn-link.interface';

/**
 * One finished turn of an Ask chat (ADR 0055 point 6): produced by the server as `done.turn`, kept
 * by the web in memory for the open chat only and sent back as is in `AskRequest.history`.
 */
export interface AskTurn {
  /** The question as the server normalised it (`ASK_LIMIT.QuestionMin` to `QuestionMax`). */
  question: string;
  /** The answer text with its `[n]` markers, at most `ASK_LIMIT.AnswerMaxChars`. */
  answer: string;
  /** Cited and shown links of the turn, at most `ASK_LIMIT.LinksPerTurnMax`. */
  links: AskTurnLink[];
}
