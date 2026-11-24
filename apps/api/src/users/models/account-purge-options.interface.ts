/** Test hooks of `AccountPurgeService.run`. */
export interface AccountPurgeOptions {
  now?: Date;
  batchSize?: number;
  budgetMs?: number;
}
