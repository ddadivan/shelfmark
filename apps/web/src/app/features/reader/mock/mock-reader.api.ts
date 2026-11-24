import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  READER_LIMIT,
  type ReaderArticleResponse,
  type ReaderProgress,
  type ReaderProgressRequest,
} from '@shelfmark/contracts';
import { defer, delay, of, throwError, type Observable } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { ReaderApi } from '../models/reader-api.interface';
import { mockReaderArticle } from './mock-reader-article';
import { MOCK_READER_STORAGE_KEY } from './models/mock-reader-storage-key.const';

function isProgress(value: unknown): value is ReaderProgress {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Partial<Record<keyof ReaderProgress, unknown>>;
  return (
    typeof item.linkId === 'string' &&
    typeof item.fraction === 'number' &&
    typeof item.minutesLeft === 'number' &&
    typeof item.updatedAt === 'string'
  );
}

function read(): ReaderProgress[] {
  try {
    const parsed: unknown = JSON.parse(
      globalThis.localStorage.getItem(MOCK_READER_STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(parsed) ? parsed.filter(isProgress) : [];
  } catch {
    return [];
  }
}

function write(items: readonly ReaderProgress[]): void {
  try {
    globalThis.localStorage.setItem(MOCK_READER_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable: the progress lasts until the next read.
  }
}

/**
 * Reader over the mock library (mock builds only), in step with the API. Articles come from
 * `mockReaderArticle` (readable kinds only); progress lives in `localStorage`
 * (`sm-mock-reader-progress`): started and unfinished texts of live links, newest first; a write
 * is checked like the API (404 for an unknown link, 400 out of range) and stamped with this clock.
 */
@Service()
export class MockReaderApi implements ReaderApi {
  private readonly library = inject(MockLibraryData);

  article(linkId: string): Observable<ReaderArticleResponse> {
    return defer(() => {
      const link = this.library.links.find((item) => item.id === linkId);
      if (!link) {
        return throwError(() => mockHttpError(HttpStatusCode.NotFound));
      }
      return of({ article: mockReaderArticle(link) });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  progress(): Observable<ReaderProgress[]> {
    return defer(() => {
      const live = new Set(this.library.links.map((link) => link.id));
      const items = read()
        .filter(
          (item) =>
            live.has(item.linkId) &&
            item.fraction >= READER_LIMIT.StartedFraction &&
            item.fraction < READER_LIMIT.DoneFraction,
        )
        .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, READER_LIMIT.ContinueMax);
      return of(items);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  saveProgress(linkId: string, request: ReaderProgressRequest): Observable<void> {
    return defer(() => {
      // Like the API: a live link of the account, a share 0 to 1, whole minutes; the time is ours.
      if (!this.library.links.some((link) => link.id === linkId)) {
        return throwError(() => mockHttpError(HttpStatusCode.NotFound));
      }
      const { fraction, minutesLeft } = request;
      if (
        !Number.isFinite(fraction) ||
        fraction < 0 ||
        fraction > 1 ||
        !Number.isInteger(minutesLeft) ||
        minutesLeft < 0 ||
        minutesLeft > READER_LIMIT.MinutesLeftMax
      ) {
        return throwError(() => mockHttpError(HttpStatusCode.BadRequest));
      }
      const progress: ReaderProgress = {
        linkId,
        fraction,
        minutesLeft,
        updatedAt: new Date().toISOString(),
      };
      write([progress, ...read().filter((item) => item.linkId !== linkId)]);
      return of(undefined);
    });
  }
}
