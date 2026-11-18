import type { Observable } from 'rxjs';
import type {
  AiBackfillStatus,
  AiJobResponse,
  AiSettingsResponse,
  AiTickResponse,
  CreateAiDraftRequest,
  LinkAiState,
  LinkResponse,
  MeaningSearchResponse,
  RelatedLinksResponse,
  TidyApplyRequest,
  TidyApplyResponse,
  TidyCountResponse,
  TidyListResponse,
  TidyUndoRequest,
  TidyUndoResponse,
  UndoAiApplyRequest,
  UpdateAiSettingsRequest,
} from '@shelfmark/contracts';

/** Seam for the AI endpoints (`AI_ENDPOINT`, #389–#391): the plan's endpoint table, one method per route. */
export interface AiApi {
  /** `GET /api/ai/settings`: settings, intro, entitlements, usage, provider status, pending jobs, backfill. */
  getSettings(): Observable<AiSettingsResponse>;
  /** `PATCH /api/ai/settings`: the fields to change; the first `enabled: true` marks the intro seen. */
  updateSettings(request: UpdateAiSettingsRequest): Observable<AiSettingsResponse>;
  /** `POST /api/ai/drafts` (202): starts, or returns by `draftId`, the draft job of Add link. */
  createDraft(request: CreateAiDraftRequest): Observable<AiJobResponse>;
  /** `GET /api/ai/jobs/:id`: polls a draft job (404 when it is not the user's). */
  getJob(id: string): Observable<AiJobResponse>;
  /** `POST /api/ai/suggestions/:id/dismiss` (204): hides a suggestion for good. */
  dismissSuggestion(id: string): Observable<void>;
  /** `GET /api/ai/backfill`: "Process existing links" status. */
  getBackfill(): Observable<AiBackfillStatus>;
  /** `POST /api/ai/backfill`: starts it (409 when not available, AI off, or already running). */
  startBackfill(): Observable<AiBackfillStatus>;
  /** `DELETE /api/ai/backfill`: stops it; what was done stays. */
  stopBackfill(): Observable<AiBackfillStatus>;
  /** `POST /api/ai/tick`: catch-up while jobs are pending or a backfill runs. */
  tick(): Observable<AiTickResponse>;
  /** `DELETE /api/ai/data` (204): every AI summary and suggestion; user edits stay. */
  deleteData(): Observable<void>;
  /**
   * `GET /api/ai/tidy`: links in Unsorted with suggestions to review, newest first (AI-2); `after`
   * (the last link of the previous page) reads the next page.
   */
  getTidy(after?: string): Observable<TidyListResponse>;
  /** `GET /api/ai/tidy/count`: how many links Tidy would list (the Unsorted button). */
  getTidyCount(): Observable<TidyCountResponse>;
  /** `POST /api/ai/tidy/apply`: one run of the selected suggestions (409 while AI is off). */
  applyTidy(request: TidyApplyRequest): Observable<TidyApplyResponse>;
  /** `POST /api/ai/tidy/undo`: reverts a run with the `undo` payload of its apply answer. */
  undoTidy(request: TidyUndoRequest): Observable<TidyUndoResponse>;
  /** `GET /api/links/:id/ai`: the AI state of one link (Edit link, the post-save poll). */
  getLinkAi(linkId: string): Observable<LinkAiState>;
  /** `POST /api/links/:id/ai/rewrite`: a new summary (409 while the summary is the user's). */
  rewriteSummary(linkId: string): Observable<LinkAiState>;
  /** `POST /api/links/:id/ai/undo`: undoes what Automatic mode applied to one part. */
  undoApply(linkId: string, request: UndoAiApplyRequest): Observable<LinkResponse>;
  /**
   * `GET /api/ai/search` (AI-3): links found by meaning that are not word matches for `q`, always
   * 200; `items` is empty unless the status is `ready`. `q` 3 to 200 characters, else 400.
   */
  searchMeaning(q: string, limit?: number): Observable<MeaningSearchResponse>;
  /** `GET /api/links/:id/related` (AI-3): the closest other links by meaning (404 for a foreign link). */
  related(linkId: string, limit?: number): Observable<RelatedLinksResponse>;
}
