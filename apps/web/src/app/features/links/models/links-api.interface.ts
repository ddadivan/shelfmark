import type { Observable } from 'rxjs';
import type { CreateLinkRequest, LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';

/**
 * Seam for the links endpoints the add-link dialog needs (`POST /api/links/preview`,
 * `POST /api/links`). Issue #72 replaces the mock with an `HttpClient` implementation behind the
 * same `LINKS_API` token; the dialog does not change.
 */
export interface LinksApi {
  /** Preview of a URL plus the existing link when it is already saved. Errors when it cannot be fetched. */
  preview(url: string): Observable<LinkPreviewResponse>;
  /** Saves a link; duplicates are allowed ("save anyway"). */
  create(request: CreateLinkRequest): Observable<LinkResponse>;
}
