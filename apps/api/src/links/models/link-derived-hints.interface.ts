import type { LinkKind } from '@shelfmark/contracts';

/** What a caller already knows, so the derived columns do not recompute (or contradict) it. */
export interface LinkDerivedHints {
  /** A normalized URL the caller validated (length, tracking parameters); default `normalizeUrl(url)`. */
  normalizedUrl?: string;
  /** The kind from the client, the user or a fetched page; default `deriveLinkKind(url)`. */
  kind?: LinkKind;
}
