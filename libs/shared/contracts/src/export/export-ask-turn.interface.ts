import type { ExportAskTurnLink } from './export-ask-turn-link.interface';

/** One turn of an exported Ask conversation. */
export interface ExportAskTurn {
  question: string;
  /** The answer text with its `[n]` markers. */
  answer: string;
  /** The user's live links by marker number; deleted or trashed links are left out. */
  links: ExportAskTurnLink[];
  createdAt: string;
}
