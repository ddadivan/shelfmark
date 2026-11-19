import type { LinkKind } from '@shelfmark/contracts';

/** `AskFilters` resolved on the session user's own rows: a folder id, the tag's stored name, UTC bounds. */
export interface AskResolvedFilters {
  query: string | null;
  folderId: string | null;
  tag: string | null;
  kind: LinkKind | null;
  site: string | null;
  /** Inclusive start of the first day. */
  from: Date | null;
  /** Exclusive end: the start of the day after `savedTo`. */
  until: Date | null;
  favorite: boolean | null;
}
