import type { LinkResponse } from '../links/link-response.interface';
import type { LinkSuggestion } from './link-suggestion.interface';

/**
 * One link in the Tidy review list: only its `suggested` rows, already filtered (a live own folder
 * and no rule deciding the folder; tags not yet on the link; a `new-tag` whose name exists now reads
 * as `tag`).
 */
export interface TidyItem {
  link: LinkResponse;
  suggestions: LinkSuggestion[];
}
