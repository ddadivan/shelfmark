import { Service } from '@angular/core';
import type { ReaderArticleResponse, ReaderProgress } from '@shelfmark/contracts';
import { of, type Observable } from 'rxjs';
import type { ReaderApi } from '../models/reader-api.interface';

/**
 * `ReaderApi` for the real API. MOCK (Shelf): `apps/api` has no Reader extraction yet (a server
 * fetch of third-party pages needs the SSRF guard of PROJECT.md 5.8, so it is not a small
 * endpoint). Until it ships every link answers "no article", which shows the link's own picture,
 * summary and note, and progress is neither read nor kept. Nothing is faked: no request is sent.
 */
@Service()
export class HttpReaderApi implements ReaderApi {
  article(): Observable<ReaderArticleResponse> {
    return of({ article: null });
  }

  progress(): Observable<ReaderProgress[]> {
    return of([]);
  }

  saveProgress(): Observable<void> {
    return of(undefined);
  }
}
