import type {
  CleanupApplyRequest,
  CleanupApplyResponse,
  CleanupReport,
  CleanupRunRequest,
  CleanupSummary,
  CleanupUndoRequest,
  CleanupUndoResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/** Seam for the library clean-up routes (`CLEANUP_ENDPOINT`, F5, ADR 0053): one method per route. */
export interface CleanupApi {
  /** `GET /api/cleanup`: the stored report, read live (`none` before the first run). */
  getReport(): Observable<CleanupReport>;
  /** `POST /api/cleanup/run`: rule checks now, AI checks deferred; 409 while a run progresses. */
  run(request: CleanupRunRequest): Observable<CleanupReport>;
  /** `POST /api/cleanup/apply`: the selected rows in one step; the answer carries the Undo payload. */
  apply(request: CleanupApplyRequest): Observable<CleanupApplyResponse>;
  /** `POST /api/cleanup/undo`: reverts a run with the `undo` payload of its apply answer. */
  undo(request: CleanupUndoRequest): Observable<CleanupUndoResponse>;
  /** `GET /api/cleanup/summary`: the counts of the entry card on All links. */
  getSummary(): Observable<CleanupSummary>;
  /** `POST /api/cleanup/card/dismiss` (204): hides the entry card for a month. */
  dismissCard(): Observable<void>;
}
