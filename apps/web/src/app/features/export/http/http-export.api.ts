import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { ExportFormat } from '@shelfmark/contracts';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { buildExportUrl } from '../export-url';
import { EXPORT_FILE_NAME } from '../models/export-file-name.const';
import type { ExportApi } from '../models/export-api.interface';
import type { ExportScope } from '../models/export-scope.interface';
import { fileNameOf, saveBlob } from '../save-blob';
import { skipErrorToast } from '../../../core/api/skip-error-toast';

/**
 * `ExportApi` over `GET /api/export`. The file is fetched with the session cookie (same origin)
 * rather than navigated to, so a 401 or 404 becomes an error the UI can toast instead of an
 * error page replacing the app.
 */
@Service()
export class HttpExportApi implements ExportApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly doc = inject(DOCUMENT);

  download(format: ExportFormat, scope: ExportScope): Observable<void> {
    return this.http
      .get(buildExportUrl(this.base, format, scope), {
        observe: 'response',
        responseType: 'blob',
        context: skipErrorToast(),
      })
      .pipe(
        map((response) => {
          // A 2xx without a body is not a file: surface it as a failure, not a silent no-op.
          if (!response.body) {
            throw new Error('Export response has no body');
          }
          const name = fileNameOf(
            response.headers.get('Content-Disposition'),
            EXPORT_FILE_NAME[format],
          );
          saveBlob(this.doc, response.body, name);
        }),
      );
  }
}
