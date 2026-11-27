import type { LinkSortField, SortOrder } from '@shelfmark/contracts';
import type { MockLinkKeys } from './mock-link-keys.interface';

/** What the mock list cursor carries: the list it belongs to and the last item's keys and id (keyset). */
export interface MockLinkCursor extends MockLinkKeys {
  readonly s: LinkSortField;
  readonly o: SortOrder;
  readonly id: string;
}
