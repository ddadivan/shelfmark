import type { AiJobReason, AiJobStatus, LinkSuggestion } from '@shelfmark/contracts';

/** A job of the mock AI: a draft of Add link (`draftId`), or the job of a saved link (`linkId`). */
export interface MockAiJob {
  id: string;
  draftId: string | null;
  linkId: string | null;
  url: string;
  title: string;
  /** `Date.now()` when it was queued; it finishes `MOCK_AI_TIMING.JobMs` later, on the next read. */
  queuedAt: number;
  status: AiJobStatus;
  reason: AiJobReason | null;
  suggestions: LinkSuggestion[];
  summary: string | null;
}
