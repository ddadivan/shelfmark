/** Answer of the account purge cron: counts only. */
export interface AccountPurgeResponse {
  deleted: number;
  hasMore: boolean;
}
