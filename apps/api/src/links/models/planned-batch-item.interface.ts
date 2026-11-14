import type { CreateLinksBatchItem } from '@shelfmark/contracts';

/** An item of a batch create that passed the per-item checks, with its position and normalized URL. */
export interface PlannedBatchItem {
  index: number;
  item: CreateLinksBatchItem;
  normalizedUrl: string;
}
