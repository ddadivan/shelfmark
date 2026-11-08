/** Body of `GET /api/cron/demo-cleanup`. */
export interface DemoCleanupResponse {
  /** Demo users deleted by this run. */
  deleted: number;
  /** `true` when expired demo users remain (the budget ran out); the next run continues. */
  hasMore: boolean;
}
