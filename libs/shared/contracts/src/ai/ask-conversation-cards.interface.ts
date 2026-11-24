import type { AskSearchFilter } from './ask-search-filter.interface';
import type { AskSource } from './ask-source.interface';

/**
 * Link cards a stored answer showed at one point (a `links` event), re-read live: links that were
 * deleted, trashed or are not the user's are left out.
 */
export interface AskConversationCards {
  items: AskSource[];
  total: number | null;
  search: AskSearchFilter | null;
}
