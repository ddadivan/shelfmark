import type { LinkSortField, SortOrder } from '@shelfmark/contracts';

/** The decoded keyset cursor (ADR 0033): where the previous page ended. */
export interface LinkCursor {
  /** Format version. */
  v: number;
  /** Sort field the cursor was issued for. */
  s: LinkSortField;
  /** Sort order the cursor was issued for. */
  o: SortOrder;
  /** Sort key of the last row: ISO timestamp for `createdAt`, the stored lower-case title for `title`. */
  k: string;
  /** Id of the last row, the tie-breaker. */
  id: string;
}
