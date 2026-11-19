import type { AskTurn } from '@shelfmark/contracts';

/** One Ask request after validation: the normalised question and the open chat's earlier turns. */
export interface AskQuestion {
  question: string;
  history: AskTurn[];
}
