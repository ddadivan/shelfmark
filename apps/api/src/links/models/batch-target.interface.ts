import type { PlannedBatchItem } from './planned-batch-item.interface';

/** A batch item about to be inserted, with its folder and tag ids (the request's or its rule's). */
export interface BatchTarget {
  entry: PlannedBatchItem;
  folderId: string | null;
  tagIds: readonly string[];
}
