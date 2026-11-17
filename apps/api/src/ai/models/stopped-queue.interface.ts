import type { CanceledBatch } from './canceled-batch.interface';

/** What turning AI off stopped: open batches to cancel after the commit, backfill jobs to refund. */
export interface StoppedQueue {
  canceled: CanceledBatch[];
  backfillSkipped: number;
}
