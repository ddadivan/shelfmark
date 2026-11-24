import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  READER_ENDPOINT,
  type ReaderArticleResponse,
  type ReaderProgress,
  type ReaderProgressRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { ReaderApi } from '../models/reader-api.interface';

/**
 * `ReaderApi` over `READER_ENDPOINT`. Reader falls back to the link's own picture, summary and note
 * and progress is a convenience, so none of these show an error toast.
 */
@Service()
export class HttpReaderApi implements ReaderApi {
  private readonly http = inject(HttpClient);

  article(linkId: string): Observable<ReaderArticleResponse> {
    return this.http.get<ReaderArticleResponse>(
      READER_ENDPOINT.Article.replace(':id', encodeURIComponent(linkId)),
      { context: skipErrorToast() },
    );
  }

  progress(): Observable<ReaderProgress[]> {
    return this.http.get<ReaderProgress[]>(READER_ENDPOINT.Progress, {
      context: skipErrorToast(),
    });
  }

  saveProgress(linkId: string, request: ReaderProgressRequest): Observable<void> {
    return this.http.put<void>(
      READER_ENDPOINT.LinkProgress.replace(':linkId', encodeURIComponent(linkId)),
      request,
      { context: skipErrorToast() },
    );
  }
}
