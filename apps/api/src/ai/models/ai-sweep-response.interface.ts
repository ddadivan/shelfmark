/** `GET /api/cron/ai-sweep` answer: counts only (the per-user catch-up runs after the response). */
export interface AiSweepResponse {
  /** Jobs failed for good (attempts used up, or left in a batch that ended). */
  failed: number;
  /** Unattached Add link drafts older than a day, deleted. */
  deletedDrafts: number;
  /** Users whose catch-up was started. */
  users: number;
}
