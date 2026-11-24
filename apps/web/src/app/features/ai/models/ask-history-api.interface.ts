import type {
  AskConversationListResponse,
  AskConversationResponse,
  AskConversationsDeletedResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/**
 * Ask history (ADR 0055 amendment, 2026-11-24): the session user's conversations stored on the
 * server. Turns are written by `POST /api/ai/ask` only; nothing here sends an answer.
 */
export interface AskHistoryApi {
  /** `GET /api/ai/ask/conversations`: newest first, paged by `cursor`. */
  list(cursor?: string): Observable<AskConversationListResponse>;
  /** `GET /api/ai/ask/conversations/:id` (404 for a foreign or deleted one). */
  get(id: string): Observable<AskConversationResponse>;
  /** `DELETE /api/ai/ask/conversations/:id`. */
  remove(id: string): Observable<void>;
  /** `DELETE /api/ai/ask/conversations` ("Clear all"). */
  clear(): Observable<AskConversationsDeletedResponse>;
}
