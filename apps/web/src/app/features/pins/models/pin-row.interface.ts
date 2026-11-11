import type { FolderResponse, LinkResponse, PinKind } from '@shelfmark/contracts';

/** One row of the Pinned section: the live folder or link behind a pin. */
export interface PinRow {
  /** `kind:id`, stable across reorders (the `@for` track). */
  readonly key: string;
  readonly kind: PinKind;
  readonly id: string;
  readonly folder: FolderResponse | null;
  readonly link: LinkResponse | null;
}
