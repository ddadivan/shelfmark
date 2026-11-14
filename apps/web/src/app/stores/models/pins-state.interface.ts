import type { PinResponse } from '@shelfmark/contracts';

/** State of `PinsStore`. */
export interface PinsState {
  /** The pinned items in sidebar order (what the API answered, plus optimistic changes). */
  items: PinResponse[];
  /** The first list has arrived. */
  loaded: boolean;
  loading: boolean;
  /** The first list failed. */
  error: boolean;
}
