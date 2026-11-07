import type { LinkResponse } from '@shelfmark/contracts';

/** The settled answer of the API for one query. */
export interface SearchState {
  /** The query the answer is for; empty before the first search. */
  readonly query: string;
  readonly links: readonly LinkResponse[];
  /** There are more links than shown. */
  readonly more: boolean;
  /** The request failed; `links` is empty. */
  readonly failed: boolean;
}
