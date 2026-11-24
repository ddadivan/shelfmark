import type { AskConversationCards } from './ask-conversation-cards.interface';
import type { AskConversationStep } from './ask-conversation-step.interface';
import type { AskDepth } from './ask-depth.type';
import type { AskSource } from './ask-source.interface';
import type { AskTurn } from './ask-turn.interface';

/**
 * One stored turn of an Ask conversation, as the server wrote it when the answer finished. Links
 * are stored by id only and re-read live with the session user on every read.
 */
export interface AskConversationTurn {
  /** The question, the answer text with its `[n]` markers and the live links by marker. */
  turn: AskTurn;
  /** Cited and shown links that are still live, ordered by `n`. */
  sources: AskSource[];
  /** Card groups in answer order, live links only. */
  cards: AskConversationCards[];
  steps: AskConversationStep[];
  notFound: boolean;
  truncated: boolean;
  depth: AskDepth;
  /** ISO 8601. */
  createdAt: string;
}
