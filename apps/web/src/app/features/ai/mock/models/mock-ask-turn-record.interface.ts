import type { AskConversationStep, AskDepth, AskSearchFilter, AskTurn } from '@shelfmark/contracts';

/** One stored turn of the mock Ask history: links by id, card groups by marker number. */
export interface MockAskTurnRecord {
  readonly turn: AskTurn;
  readonly steps: AskConversationStep[];
  readonly cards: { n: number[]; total: number | null; search: AskSearchFilter | null }[];
  readonly notFound: boolean;
  readonly truncated: boolean;
  readonly depth: AskDepth;
  /** ms since the epoch. */
  readonly createdAt: number;
}
