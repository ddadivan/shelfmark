import type { AiJobReason } from './ai-job-reason.type';
import type { AiJobStatus } from './ai-job-status.type';
import type { LinkSuggestion } from './link-suggestion.interface';

/** `POST /api/ai/drafts` (202) and `GET /api/ai/jobs/:id`: a draft job and its result so far. */
export interface AiJobResponse {
  id: string;
  status: AiJobStatus;
  reason: AiJobReason | null;
  /** Empty until `done`. */
  suggestions: LinkSuggestion[];
  /** AI summary once `done` and summaries are on, else `null`. */
  summary: string | null;
}
