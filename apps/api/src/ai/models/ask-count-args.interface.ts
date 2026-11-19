import type { AskFilters } from './ask-filters.interface';
import type { AskGroupBy } from './ask-group-by.type';

/** Parsed `count_links` arguments. */
export interface AskCountArgs {
  filters: AskFilters;
  groupBy: AskGroupBy | null;
}
