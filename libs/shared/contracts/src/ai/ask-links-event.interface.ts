import type { ASK_EVENT_TYPE } from './ask-event-type.const';
import type { AskSearchFilter } from './ask-search-filter.interface';
import type { AskSource } from './ask-source.interface';

/**
 * Link cards at this point of the answer (ADR 0055 point 2, `show_links`); `n` shares the citation
 * numbering of the answer.
 */
export interface AskLinksEvent {
  type: typeof ASK_EVENT_TYPE.Links;
  items: AskSource[];
  /**
   * How many links matched the search the cards came from, when that is more than the cards
   * (for "Show all N in search"); `null` when unknown or not more.
   */
  total: number | null;
  /** The search to open for "Show all N in search", `null` when there is none. */
  search: AskSearchFilter | null;
}
