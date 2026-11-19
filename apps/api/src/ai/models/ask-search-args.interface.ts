import type { AskFilters } from './ask-filters.interface';

/** Parsed `search_links` arguments. */
export interface AskSearchArgs {
  filters: AskFilters;
  offset: number;
  limit: number;
}
