import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import type { ExportFormat } from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { buildExportUrl } from '../export-url';
import { EXPORT_FILE_NAME } from '../models/export-file-name.const';
import { EXPORT_MOCK_MARKER } from '../models/export-mock-marker.const';
import type { ExportApi } from '../models/export-api.interface';
import type { ExportScope } from '../models/export-scope.interface';
import { MOCK_EXPORT_FAILS_TAG } from '../models/mock-export-fails-tag.const';
import { saveBlob } from '../save-blob';

/**
 * `ExportApi` that saves a tiny file holding the URL the real API would have been asked for,
 * after a simulated delay. The first export with the tag
 * `MOCK_EXPORT_FAILS_TAG` fails; the retry succeeds.
 */
@Service()
export class MockExportApi implements ExportApi {
  private readonly base = inject(API_BASE_URL);
  private readonly doc = inject(DOCUMENT);
  private failedOnce = false;

  download(format: ExportFormat, scope: ExportScope): Observable<void> {
    return defer(() => {
      if (!this.failedOnce && scope.tags?.includes(MOCK_EXPORT_FAILS_TAG)) {
        this.failedOnce = true;
        return throwError(() => new Error('Mock: export failed'));
      }
      const url = buildExportUrl(this.base, format, scope);
      const blob = new Blob([`${EXPORT_MOCK_MARKER}\n${url}\n`], { type: 'text/plain' });
      saveBlob(this.doc, blob, EXPORT_FILE_NAME[format]);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }
}
