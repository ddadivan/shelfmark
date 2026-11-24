import type { ReaderArticleResponse, ReaderProgress } from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/**
 * Seam for Reader (`READER_ENDPOINT`, Shelf Link page): the readable text of a link and how far it
 * was read. The API has no extraction yet (it needs the SSRF-safe fetcher, PROJECT.md 5.8): the
 * HTTP implementation answers "no article" and no progress without a request; the mock builds
 * serve articles for the mock library.
 */
export interface ReaderApi {
  /** The article of a saved link; `article: null` when the page has none. */
  article(linkId: string): Observable<ReaderArticleResponse>;
  /** Links started in Reader and not finished, the most recent first. */
  progress(): Observable<ReaderProgress[]>;
  /** Stores how far a link was read. */
  saveProgress(progress: ReaderProgress): Observable<void>;
}
