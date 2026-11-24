import type { ExportAskTurn } from './export-ask-turn.interface';

/**
 * A stored Ask conversation in the JSON export (ADR 0055 amendment, 2026-11-24): its title and
 * turns, oldest first. Only a full export carries them.
 */
export interface ExportAskConversation {
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ExportAskTurn[];
}
