import type { LinkResponse } from '@shelfmark/contracts';

/**
 * What a write of `LinksStore` changed, published on `LinksStore.linkChanges` whether or not the
 * link is loaded in its own feed (ADR 0044). A second feed (the right half of the side-by-side
 * view) applies it with `placeLink`.
 */
export interface LinkChange {
  /** Links in their new state (a move, an edit, a save, an Undo or a rollback). */
  readonly upserted?: readonly LinkResponse[];
  /**
   * The links moved into their folder or were just saved: a feed that never held them may insert
   * them. Without it (an edit, a favorite, tags, a rollback) they only update what a feed holds.
   */
  readonly moved?: true;
  /** Ids of links that are gone (deleted, in their Undo window, or dropped). */
  readonly removed?: readonly string[];
  /** Too coarse to apply (a folder or tag change, a refresh): load again. */
  readonly reload?: true;
}
