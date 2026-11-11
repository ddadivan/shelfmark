import { LINK_KIND, type LinkKind } from '@shelfmark/contracts';

const KINDS: readonly string[] = Object.values(LINK_KIND);

/** Narrows a value to a `LinkKind`. */
export function isLinkKind(value: unknown): value is LinkKind {
  return typeof value === 'string' && KINDS.includes(value);
}

/** The kind of `?kind=`; an absent, repeated or unknown value is no kind filter. */
export function parseLinkKind(raw: unknown): LinkKind | undefined {
  return isLinkKind(raw) ? raw : undefined;
}
