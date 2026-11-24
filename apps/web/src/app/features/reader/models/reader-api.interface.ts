import type {
  ReaderArticleResponse,
  ReaderProgress,
  ReaderProgressRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/**
 * Seam for Reader (`READER_ENDPOINT`, Shelf Link page): the readable text of a link (extracted by
 * the API behind the SSRF-safe fetcher and stored per link) and how far it was read. The mock
 * serves articles for the mock library.
 */
export interface ReaderApi {
  /** The article of a saved link; `article: null` when the page has none. */
  article(linkId: string): Observable<ReaderArticleResponse>;
  /** Links started in Reader and not finished, the most recent first. */
  progress(): Observable<ReaderProgress[]>;
  /** Stores how far a link was read (the server stamps the time). */
  saveProgress(linkId: string, request: ReaderProgressRequest): Observable<void>;
}
