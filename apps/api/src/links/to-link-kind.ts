import { LINK_KIND, type LinkKind } from '@shelfmark/contracts';

const KINDS: readonly string[] = Object.values(LINK_KIND);

function isLinkKind(value: string): value is LinkKind {
  return KINDS.includes(value);
}

/** The `links.kind` column as the contract type; the CHECK keeps it valid, anything else reads as `other`. */
export function toLinkKind(value: string): LinkKind {
  return isLinkKind(value) ? value : LINK_KIND.Other;
}
