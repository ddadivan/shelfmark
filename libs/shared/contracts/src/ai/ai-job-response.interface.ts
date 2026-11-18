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
  /**
   * A cleaned-up title for a draft (Add link, "Fill in with AI"): no site-name suffix, tracking junk
   * or shouting, in the page's language, at most `LINK_LIMIT.TitleMax`. `null` for a saved link's job,
   * when the model had nothing better than the page title, or before `done`.
   */
  title: string | null;
}
