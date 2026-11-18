import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  CLEANUP_ENDPOINT,
  type CleanupApplyRequest,
  type CleanupApplyResponse,
  type CleanupReport,
  type CleanupRunRequest,
  type CleanupSummary,
  type CleanupUndoRequest,
  type CleanupUndoResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { CleanupApi } from '../models/cleanup-api.interface';

/**
 * `CleanupApi` over `CLEANUP_ENDPOINT`. The services show their own toasts for apply and Undo, and
 * the entry card is optional, so no request uses the generic error toast.
 */
@Service()
export class HttpCleanupApi implements CleanupApi {
  private readonly http = inject(HttpClient);

  getReport(): Observable<CleanupReport> {
    return this.http.get<CleanupReport>(CLEANUP_ENDPOINT.Report, { context: skipErrorToast() });
  }

  run(request: CleanupRunRequest): Observable<CleanupReport> {
    return this.http.post<CleanupReport>(CLEANUP_ENDPOINT.Run, request, {
      context: skipErrorToast(),
    });
  }

  apply(request: CleanupApplyRequest): Observable<CleanupApplyResponse> {
    return this.http.post<CleanupApplyResponse>(CLEANUP_ENDPOINT.Apply, request, {
      context: skipErrorToast(),
    });
  }

  undo(request: CleanupUndoRequest): Observable<CleanupUndoResponse> {
    return this.http.post<CleanupUndoResponse>(CLEANUP_ENDPOINT.Undo, request, {
      context: skipErrorToast(),
    });
  }

  getSummary(): Observable<CleanupSummary> {
    return this.http.get<CleanupSummary>(CLEANUP_ENDPOINT.Summary, { context: skipErrorToast() });
  }

  dismissCard(): Observable<void> {
    return this.http.post<void>(CLEANUP_ENDPOINT.DismissCard, {}, { context: skipErrorToast() });
  }
}
