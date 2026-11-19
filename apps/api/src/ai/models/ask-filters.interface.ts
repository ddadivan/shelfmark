import type { LinkKind } from '@shelfmark/contracts';

/** The filters of `search_links` and `count_links` as parsed, before they are resolved on the user's rows. */
export interface AskFilters {
  /** Words, each must appear (title, URL, summary, tag names, the note only with the switch). */
  query: string | null;
  /** Folder path (`Parent / Child`) or a unique folder name. */
  folder: string | null;
  tag: string | null;
  kind: LinkKind | null;
  /** Host without scheme or `www.`, lower case. */
  site: string | null;
  /** First UTC day, `YYYY-MM-DD`. */
  savedFrom: string | null;
  /** Last UTC day (inclusive), `YYYY-MM-DD`. */
  savedTo: string | null;
  favorite: boolean | null;
}
