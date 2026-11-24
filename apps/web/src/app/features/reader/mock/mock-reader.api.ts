import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  READER_LIMIT,
  type ReaderArticleResponse,
  type ReaderProgress,
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
 * MOCK (Shelf): Reader over the mock library (mock builds only). Articles come from
 * `mockReaderArticle` (readable kinds only); progress lives in `localStorage`
 * (`sm-mock-reader-progress`): started and unfinished texts of live links, newest first.
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

  saveProgress(progress: ReaderProgress): Observable<void> {
    return defer(() => {
      write([progress, ...read().filter((item) => item.linkId !== progress.linkId)]);
      return of(undefined);
    });
  }
}
