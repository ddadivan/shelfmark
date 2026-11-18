import type { AiBackfillStatus } from './ai-backfill-status.interface';
import type { CleanupState } from '../cleanup/cleanup-state.type';
import type { AiSearchStatus } from './ai-search-status.interface';

/** `POST /api/ai/tick` answer. */
export interface AiTickResponse {
  pendingJobs: number;
  backfill: AiBackfillStatus;
  search: AiSearchStatus;
  /** State of the user's clean-up report; the tick continues a `running` one (AI-5). */
  cleanup: CleanupState;
}
