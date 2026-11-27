import type { LinkKind } from '@shelfmark/contracts';

/** The columns of a link row that are computed from its URL and title (never sent by clients). */
export interface LinkDerivedColumns {
  normalizedUrl: string;
  titleSortKey: string;
  host: string;
  kind: LinkKind;
}
