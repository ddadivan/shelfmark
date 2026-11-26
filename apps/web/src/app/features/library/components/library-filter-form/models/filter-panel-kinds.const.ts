import { LINK_KIND, type LinkKind } from '@shelfmark/contracts';

/** The kinds the Filter popover offers (Shelf): every kind but `other`, in `LINK_KIND` order. */
export const FILTER_PANEL_KINDS: readonly LinkKind[] = Object.values(LINK_KIND).filter(
  (kind) => kind !== LINK_KIND.Other,
);
