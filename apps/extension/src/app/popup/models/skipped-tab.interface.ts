import type { LinkBatchErrorCode } from '@shelfmark/contracts';
import type { TabEntry } from './tab-entry.interface';

/** A tab the API left out of the batch, with the reason. */
export interface SkippedTab {
  readonly entry: TabEntry;
  readonly code: LinkBatchErrorCode;
}
