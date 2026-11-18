import type { LinkResponse } from '@shelfmark/contracts';

/** A row of "Related on your shelf": the link, its address and the reasons ("angular, Clothes"). */
export interface RelatedLinkRow {
  readonly link: LinkResponse;
  /** The address the row opens; `undefined` for a scheme the app does not open. */
  readonly href: string | undefined;
  readonly host: string;
  readonly letter: string;
  /** The "why" reasons joined with commas; empty without reasons. */
  readonly reasons: string;
}
