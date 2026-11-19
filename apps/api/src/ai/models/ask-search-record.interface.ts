import type { AskSearchFilter } from '@shelfmark/contracts';

/** What one `search_links` call found, kept by the loop for "Show all N in search" and `notFound`. */
export interface AskSearchRecord {
  total: number;
  /** Refs of the links it returned, in order. */
  refs: number[];
  /** The search the feed can show again, `null` when it used a site or date filter. */
  filter: AskSearchFilter | null;
}
