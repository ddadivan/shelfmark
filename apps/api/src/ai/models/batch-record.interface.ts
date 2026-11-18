/** A provider batch a backfill chunk was just submitted as, before it is recorded in `ai_batches`. */
export interface BatchRecord {
  provider: string;
  providerBatchId: string;
  /** The provider answered at once (the mock): the batch is recorded as ended. */
  completed: boolean;
  /** The chunk's folder keys, kept on its jobs while the batch runs. */
  folderKeys: { folderKeys: Record<string, string> };
}
