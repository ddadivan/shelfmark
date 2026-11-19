import type { KeyCap } from '../../../../shortcuts/models/key-cap.interface';

/** A help step as rendered: the text around the key caps. */
export interface ImportHelpRow {
  id: string;
  before: string;
  caps: readonly KeyCap[];
  after: string;
}
