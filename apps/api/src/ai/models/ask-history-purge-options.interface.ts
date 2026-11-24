/** Test seams of `AskHistoryPurgeService.run`. */
export interface AskHistoryPurgeOptions {
  batchSize?: number;
  budgetMs?: number;
  now?: Date;
}
