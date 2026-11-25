import type { LinkSortField, SortOrder } from '@shelfmark/contracts';
import type { CursorKeys } from './cursor-keys.interface';

/** The decoded keyset cursor (ADR 0033): where the previous page ended. */
export interface LinkCursor extends CursorKeys {
  /** Format version. */
  v: number;
  /** Sort field the cursor was issued for. */
  s: LinkSortField;
  /** Sort order the cursor was issued for. */
  o: SortOrder;
  /**
   * Sort key of the last row: ISO timestamp for `createdAt`, `updatedAt` and `lastOpenedAt`, the
   * stored lower-case title for `title`, the host for `host`, `1` / `0` for `favorite`.
   */
  k: string | null;
  /** Id of the last row, the tie-breaker. */
  id: string;
}
