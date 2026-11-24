import type { AskSearchFilter } from '@shelfmark/contracts';

/**
 * One card group of a stored Ask turn (`ask_conversation_turns.cards`): the marker numbers of its
 * links (never link data), the "Show all" total and the feed search, as the `links` event had them.
 */
export interface AskStoredCards {
  n: number[];
  total: number | null;
  search: AskSearchFilter | null;
}
