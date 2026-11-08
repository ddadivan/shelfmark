import type { LinkSortField, SortOrder } from '@shelfmark/contracts';

/** The API's `sort` and `order` for one feed sort. */
export interface FeedSortQuery {
  readonly sort: LinkSortField;
  readonly order: SortOrder;
}
