import type { AiAppliedPart } from './ai-applied-part.type';

/** `POST /api/links/:id/ai/undo` body. */
export interface UndoAiApplyRequest {
  part: AiAppliedPart;
}
