import type { LinksBatchItemInput } from './links-batch-item-input.interface';

/** An item of a batch create that passed the per-item checks, with its position and normalized URL. */
export interface PlannedBatchItem {
  index: number;
  item: LinksBatchItemInput;
  normalizedUrl: string;
}
