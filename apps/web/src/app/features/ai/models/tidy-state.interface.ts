import type { TidyItem } from '@shelfmark/contracts';

/** State of the Tidy review page (`TidyStore`). */
export interface TidyState {
  /** The page of links to review, newest first. */
  items: TidyItem[];
  /** All links Tidy would list from this page on (more than one page above `TIDY_LIMIT.PageMax`). */
  total: number;
  /** The page starts after this link (`null`: the first page). */
  after: string | null;
  loading: boolean;
  loaded: boolean;
  /** Suggestion ids the user left out (chips start selected). */
  deselected: string[];
  /** Link ids the user skipped (kept only on this page). */
  skipped: string[];
  /** An apply run is on its way. */
  applying: boolean;
}
