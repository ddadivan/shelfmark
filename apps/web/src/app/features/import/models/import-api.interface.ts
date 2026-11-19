import type {
  FinishImportRequest,
  ImportCheckResponse,
  ImportGroupsRequest,
  ImportGroupsResponse,
  ImportLinksRequest,
  ImportLinksResponse,
  ImportSummary,
  ListImportsResponse,
  StartImportRequest,
  StartImportResponse,
  UndoImportResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/** Seam for `IMPORT_ENDPOINT` (ADR 0056); every failure is an error of the observable. */
export interface ImportApi {
  list(): Observable<ListImportsResponse>;
  /** One import, polled while its AI pass runs. */
  get(id: string): Observable<ImportSummary>;
  check(urls: readonly string[]): Observable<ImportCheckResponse>;
  /** AI groups for the links of a file (nothing is written; uses the allowance). */
  groups(request: ImportGroupsRequest): Observable<ImportGroupsResponse>;
  start(request: StartImportRequest): Observable<StartImportResponse>;
  addLinks(id: string, request: ImportLinksRequest): Observable<ImportLinksResponse>;
  finish(id: string, request: FinishImportRequest): Observable<void>;
  undo(id: string): Observable<UndoImportResponse>;
}
