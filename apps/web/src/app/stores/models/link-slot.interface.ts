import type { LinkResponse } from '@shelfmark/contracts';

/** A link a list lost to a delete, and the slot it had, so Undo can put it back there. */
export interface LinkSlot {
  readonly link: LinkResponse;
  readonly index: number;
}
