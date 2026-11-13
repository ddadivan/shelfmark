import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { HttpStatusCode } from '@angular/common/http';
import { EXPORT_FORMAT, FOLDER_ERROR_MESSAGE, type ExportFormat } from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { buildExportUrl } from '../utils/export-url';
import { EXPORT_MOCK_MARKER } from '../models/export-mock-marker.const';
import type { ExportApi } from '../models/export-api.interface';
import type { ExportScope } from '../models/export-scope.interface';
import { MOCK_EXPORT_FAILS_TAG } from '../models/mock-export-fails-tag.const';
import { saveBlob } from '../utils/save-blob';

/**
 * `ExportApi` that saves a tiny file holding the URL the real API would have been asked for,
 * after a simulated delay. The first export with the tag
 * `MOCK_EXPORT_FAILS_TAG` fails; the retry succeeds.
 */
@Service()
export class MockExportApi implements ExportApi {
  private readonly base = inject(API_BASE_URL);
  private readonly doc = inject(DOCUMENT);
  private readonly data = inject(MockLibraryData);
  private failedOnce = false;

  download(format: ExportFormat, scope: ExportScope): Observable<void> {
    return defer(() => {
      if (!this.failedOnce && scope.tags?.includes(MOCK_EXPORT_FAILS_TAG)) {
        this.failedOnce = true;
        return throwError(() => new Error('Mock: export failed'));
      }
      // Like the API: an unknown format is a 400, a folder that is not the user's a 404.
      if (!(Object.values(EXPORT_FORMAT) as string[]).includes(format)) {
        return throwError(() => mockHttpError(HttpStatusCode.BadRequest, ['format is not valid']));
      }
      if (
        scope.folderId !== undefined &&
        !this.data.folderList.some((folder) => folder.id === scope.folderId)
      ) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, FOLDER_ERROR_MESSAGE.NotFound),
        );
      }
      const url = buildExportUrl(this.base, format, scope);
      const blob = new Blob([`${EXPORT_MOCK_MARKER}\n${url}\n`], { type: 'text/plain' });
      // Named like the API's `Content-Disposition`: `shelfmark-<day>.<format>`.
      saveBlob(this.doc, blob, `shelfmark-${new Date().toISOString().slice(0, 10)}.${format}`);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
