import type { AskTurn } from '@shelfmark/contracts';

/**
 * One Ask request after validation: the normalised question, the open chat's earlier turns (used
 * when no stored conversation is continued) and the stored conversation to continue, if any.
 */
export interface AskQuestion {
  question: string;
  history: AskTurn[];
  conversationId?: string | null;
}
