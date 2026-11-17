import type { AiBackfillStatus } from './ai-backfill-status.interface';

/** `POST /api/ai/tick` answer. */
export interface AiTickResponse {
  pendingJobs: number;
  backfill: AiBackfillStatus;
}
