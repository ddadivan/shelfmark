import { IMPORT_LIMIT } from '@shelfmark/contracts';
import { IMPORT_GROUPING_LIMIT } from '../models/import-grouping-limit.const';

/** How many clusters to try for `links` links: `round(sqrt(links / 4))` within 2 and `GroupsMax`. */
export function importGroupCount(links: number): number {
  return Math.min(
    IMPORT_LIMIT.GroupsMax,
    Math.max(IMPORT_GROUPING_LIMIT.KMin, Math.round(Math.sqrt(links / 4))),
  );
}
