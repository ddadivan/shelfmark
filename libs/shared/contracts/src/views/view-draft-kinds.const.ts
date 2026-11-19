import { LINK_KIND } from '../links/link-kind.const';
import type { LinkKind } from '../links/link-kind.type';

/**
 * Kinds a view from a phrase may ask for (#537): every kind but `other`, which no phrase names
 * (the dialog still offers it by hand).
 */
export const VIEW_DRAFT_KINDS: readonly LinkKind[] = Object.values(LINK_KIND).filter(
  (kind) => kind !== LINK_KIND.Other,
);
