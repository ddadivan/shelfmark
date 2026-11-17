import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  AI_APPLIED_PART,
  AI_FEATURE_MODE,
  type AiBackfillStatus,
  type AiJobResponse,
  type AiSettingsResponse,
  type AiTickResponse,
  type CreateAiDraftRequest,
  type LinkAiState,
  type LinkResponse,
  type UndoAiApplyRequest,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { AiApi } from '../models/ai-api.interface';
import { MockAiData } from './mock-ai-data';

function failure(status: number, message?: string | string[]): Observable<never> {
  return throwError(() => mockHttpError(status, message));
}

function isMode(value: unknown): boolean {
  return Object.values<unknown>(AI_FEATURE_MODE).includes(value);
}

/** What the API's `UpdateAiSettingsDto` would reject: nothing to change, or a wrong value. */
function settingsProblems(request: UpdateAiSettingsRequest): string[] {
  const problems: string[] = [];
  if (Object.keys(request).length === 0) {
    problems.push('at least one setting is required');
  }
  if (request.folderMode !== undefined && !isMode(request.folderMode)) {
    problems.push('folderMode is invalid');
  }
  if (request.tagsMode !== undefined && !isMode(request.tagsMode)) {
    problems.push('tagsMode is invalid');
  }
  return problems;
}

/**
 * `AiApi` over `MockAiData`, with simulated latency (mock builds only). Like the API: 404 for an
 * unknown job, suggestion or link, 409 for a rewrite of the user's summary, a backfill that cannot
 * start or a rewrite at the monthly limit. URLs with `MOCK_AI_URL_MARKER` parts fail on purpose.
 */
@Service()
export class MockAiApi implements AiApi {
  private readonly data = inject(MockAiData);

  getSettings(): Observable<AiSettingsResponse> {
    return defer(() => of(this.data.settingsResponse())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  updateSettings(request: UpdateAiSettingsRequest): Observable<AiSettingsResponse> {
    return defer(() => {
      const problems = settingsProblems(request);
      return problems.length > 0
        ? failure(HttpStatusCode.BadRequest, problems)
        : of(this.data.updateSettings(request));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  createDraft(request: CreateAiDraftRequest): Observable<AiJobResponse> {
    return defer(() =>
      of(this.data.draft(request.draftId, request.url, request.title ?? request.url)),
    ).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  getJob(id: string): Observable<AiJobResponse> {
    return defer(() => {
      const job = this.data.job(id);
      return job ? of(job) : failure(HttpStatusCode.NotFound);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  dismissSuggestion(id: string): Observable<void> {
    return defer(() =>
      this.data.dismiss(id) ? of(undefined) : failure(HttpStatusCode.NotFound),
    ).pipe(delay(MOCK_LATENCY_MS.List));
  }

  getBackfill(): Observable<AiBackfillStatus> {
    return defer(() => of(this.data.backfillStatus())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  startBackfill(): Observable<AiBackfillStatus> {
    return defer(() => {
      const started = this.data.startBackfill();
      return typeof started === 'string' ? failure(HttpStatusCode.Conflict) : of(started);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  stopBackfill(): Observable<AiBackfillStatus> {
    return defer(() => of(this.data.stopBackfill())).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  tick(): Observable<AiTickResponse> {
    return defer(() => {
      this.data.settle();
      return of({ pendingJobs: this.data.pendingJobs(), backfill: this.data.backfillStatus() });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  deleteData(): Observable<void> {
    return defer(() => {
      this.data.deleteData();
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  getLinkAi(linkId: string): Observable<LinkAiState> {
    return defer(() => {
      const state = this.data.linkState(linkId);
      return state ? of(state) : failure(HttpStatusCode.NotFound);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  rewriteSummary(linkId: string): Observable<LinkAiState> {
    return defer(() => {
      const state = this.data.rewrite(linkId);
      if (state === null) {
        return failure(HttpStatusCode.NotFound);
      }
      return typeof state === 'string' ? failure(HttpStatusCode.Conflict, state) : of(state);
    }).pipe(delay(MOCK_LATENCY_MS.Preview));
  }

  undoApply(linkId: string, request: UndoAiApplyRequest): Observable<LinkResponse> {
    return defer(() => {
      if (!Object.values<unknown>(AI_APPLIED_PART).includes(request.part)) {
        return failure(HttpStatusCode.BadRequest, ['part is invalid']);
      }
      const link = this.data.undo(linkId, request.part);
      return link ? of(link) : failure(HttpStatusCode.NotFound);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }
}
