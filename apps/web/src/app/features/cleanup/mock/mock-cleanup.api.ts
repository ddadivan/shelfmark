import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  CLEANUP_ERROR_MESSAGE,
  CLEANUP_LIMIT,
  type CleanupApplyRequest,
  type CleanupApplyResponse,
  type CleanupReport,
  type CleanupRunRequest,
  type CleanupSummary,
  type CleanupUndoRequest,
  type CleanupUndoResponse,
} from '@shelfmark/contracts';
import { defer, delay, of, throwError, type Observable } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { CleanupApi } from '../models/cleanup-api.interface';
import { MockCleanupData } from './mock-cleanup-data';

/** Undo body limits of the API's `CleanupUndoDto`. */
const UNDO_TRASHED_MAX = 500;
const UNDO_NAME_MAX = 50;

function failure(status: number, message?: string | string[]): Observable<never> {
  return throwError(() => mockHttpError(status, message));
}

/** What the API's `CleanupApplyDto` would reject. */
function applyProblems(request: CleanupApplyRequest): string | string[] | null {
  if (request.duplicates.length === 0 && request.tagMerges.length === 0) {
    return CLEANUP_ERROR_MESSAGE.EmptyApply;
  }
  const badItem = request.duplicates.some(
    (item) => item.trashIds.length === 0 || item.trashIds.length > CLEANUP_LIMIT.GroupSizeMax,
  );
  return request.duplicates.length > CLEANUP_LIMIT.ApplyGroupsMax ||
    request.tagMerges.length > CLEANUP_LIMIT.ApplyTagMergesMax ||
    badItem
    ? ['request is invalid']
    : null;
}

/** What the API's `CleanupUndoDto` would reject. */
function undoProblems(request: CleanupUndoRequest): string[] | null {
  const badName = request.merges.some(
    (merge) =>
      merge.mergedName.length < 1 ||
      merge.mergedName.length > UNDO_NAME_MAX ||
      [...merge.mergedName].some((char) => (char.codePointAt(0) ?? 0) < 32),
  );
  return request.trashedIds.length > UNDO_TRASHED_MAX ||
    request.merges.length > CLEANUP_LIMIT.ApplyTagMergesMax ||
    badName
    ? ['request is invalid']
    : null;
}

/**
 * `CleanupApi` over `MockCleanupData` with simulated latency (mock builds only). Like the API: 409
 * `Running` for a run while one progresses, 400 for an empty or oversized apply or Undo body.
 */
@Service()
export class MockCleanupApi implements CleanupApi {
  private readonly data = inject(MockCleanupData);

  getReport(): Observable<CleanupReport> {
    return defer(() => of(this.data.read())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  run(request: CleanupRunRequest): Observable<CleanupReport> {
    return defer(() => {
      const report = this.data.run(request.includeAi);
      return report ? of(report) : failure(HttpStatusCode.Conflict, CLEANUP_ERROR_MESSAGE.Running);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  apply(request: CleanupApplyRequest): Observable<CleanupApplyResponse> {
    return defer(() => {
      const problems = applyProblems(request);
      return problems ? failure(HttpStatusCode.BadRequest, problems) : of(this.data.apply(request));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  undo(request: CleanupUndoRequest): Observable<CleanupUndoResponse> {
    return defer(() => {
      const problems = undoProblems(request);
      return problems ? failure(HttpStatusCode.BadRequest, problems) : of(this.data.undo(request));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  getSummary(): Observable<CleanupSummary> {
    return defer(() => of(this.data.summary())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  dismissCard(): Observable<void> {
    return defer(() => {
      this.data.dismissCard();
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }
}
