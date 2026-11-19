import type {
  FinishImportRequest,
  ImportCheckResponse,
  ImportLinksRequest,
  ImportLinksResponse,
  ListImportsResponse,
  StartImportRequest,
  StartImportResponse,
  UndoImportResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/** Seam for `IMPORT_ENDPOINT` (ADR 0056); every failure is an error of the observable. */
export interface ImportApi {
  list(): Observable<ListImportsResponse>;
  check(urls: readonly string[]): Observable<ImportCheckResponse>;
  start(request: StartImportRequest): Observable<StartImportResponse>;
  addLinks(id: string, request: ImportLinksRequest): Observable<ImportLinksResponse>;
  finish(id: string, request: FinishImportRequest): Observable<void>;
  undo(id: string): Observable<UndoImportResponse>;
}
