import type { LinkResponse } from '@shelfmark/contracts';
import type { MeaningWhy } from './meaning-why.interface';

/** A row of the "Related by meaning" group. */
export interface MeaningRow {
  readonly link: LinkResponse;
  /** `null` when the server gave no reason. */
  readonly why: MeaningWhy | null;
}
