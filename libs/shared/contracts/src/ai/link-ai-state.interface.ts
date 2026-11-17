import type { AiAutoApplied } from './ai-auto-applied.interface';
import type { AiJobReason } from './ai-job-reason.type';
import type { AiJobStatus } from './ai-job-status.type';
import type { LinkSuggestion } from './link-suggestion.interface';
import type { SummarySource } from './summary-source.type';

/** `GET /api/links/:id/ai`: the AI state of one link for Edit link and the post-save poll. */
export interface LinkAiState {
  /** Latest job; `null` when AI never ran for the link. */
  aiStatus: AiJobStatus | null;
  reason: AiJobReason | null;
  summary: string | null;
  summarySource: SummarySource | null;
  /** Pending and auto-applied suggestions only. */
  suggestions: LinkSuggestion[];
  /** `null` when nothing auto-applied is undoable. */
  autoApplied: AiAutoApplied | null;
}
