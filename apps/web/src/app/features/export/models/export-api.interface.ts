import type { Observable } from 'rxjs';
import type { ExportFormat } from '@shelfmark/contracts';
import type { ExportScope } from './export-scope.interface';

/**
 * Seam for `GET /api/export`. `download` saves the file in the browser and completes when it
 * was handed over; any failure (401, 404, network) is an error of the observable.
 */
export interface ExportApi {
  download(format: ExportFormat, scope: ExportScope): Observable<void>;
}
