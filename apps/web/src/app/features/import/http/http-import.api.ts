import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  IMPORT_ENDPOINT,
  type FinishImportRequest,
  type ImportCheckRequest,
  type ImportCheckResponse,
  type ImportLinksRequest,
  type ImportLinksResponse,
  type ListImportsResponse,
  type StartImportRequest,
  type StartImportResponse,
  type UndoImportResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { ImportApi } from '../models/import-api.interface';

/**
 * `ImportApi` over `IMPORT_ENDPOINT`. The import dialog and Recent imports show their own
 * messages, so no request uses the generic error toast.
 */
@Service()
export class HttpImportApi implements ImportApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListImportsResponse> {
    return this.http.get<ListImportsResponse>(IMPORT_ENDPOINT.Base, { context: skipErrorToast() });
  }

  check(urls: readonly string[]): Observable<ImportCheckResponse> {
    const body: ImportCheckRequest = { urls: [...urls] };
    return this.http.post<ImportCheckResponse>(IMPORT_ENDPOINT.Check, body, {
      context: skipErrorToast(),
    });
  }

  start(request: StartImportRequest): Observable<StartImportResponse> {
    return this.http.post<StartImportResponse>(IMPORT_ENDPOINT.Base, request, {
      context: skipErrorToast(),
    });
  }

  addLinks(id: string, request: ImportLinksRequest): Observable<ImportLinksResponse> {
    return this.http.post<ImportLinksResponse>(this.url(id, IMPORT_ENDPOINT.Links), request, {
      context: skipErrorToast(),
    });
  }

  finish(id: string, request: FinishImportRequest): Observable<void> {
    return this.http.post<void>(this.url(id, IMPORT_ENDPOINT.Finish), request, {
      context: skipErrorToast(),
    });
  }

  undo(id: string): Observable<UndoImportResponse> {
    return this.http.post<UndoImportResponse>(
      this.url(id, IMPORT_ENDPOINT.Undo),
      {},
      { context: skipErrorToast() },
    );
  }

  private url(id: string, suffix: string): string {
    return `${IMPORT_ENDPOINT.Base}/${encodeURIComponent(id)}${suffix}`;
  }
}
