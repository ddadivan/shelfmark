import type { LinkResponse } from '@shelfmark/contracts';

/** The last list of the feed that was fully loaded. */
export interface LastShown {
  readonly items: readonly LinkResponse[];
  readonly hasMore: boolean;
}
