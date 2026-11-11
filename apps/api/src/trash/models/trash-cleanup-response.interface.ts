/** Body of `GET /api/cron/trash-cleanup`. */
export interface TrashCleanupResponse {
  /** Rows deleted by this run (links and folders; subfolders removed by a cascade are not counted). */
  deleted: number;
  /** `true` when expired rows remain (the budget ran out); the next run continues. */
  hasMore: boolean;
}
