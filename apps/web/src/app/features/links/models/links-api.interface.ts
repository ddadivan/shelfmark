import type { Observable } from 'rxjs';
import type {
  CreateLinkRequest,
  LinkPreviewResponse,
  LinkResponse,
  ListLinksQuery,
  ListLinksResponse,
  OpenLinkResponse,
  RecentLinksQuery,
  RecentLinksResponse,
  UpdateLinkRequest,
} from '@shelfmark/contracts';

/**
 * Seam for the links endpoints (`/api/links`). Issue #72 replaces the mock with an `HttpClient`
 * implementation behind the same `LINKS_API` token; the dialog and the feed do not change.
 */
export interface LinksApi {
  /** Preview of a URL plus the existing link when it is already saved. Errors when it cannot be fetched. */
  preview(url: string): Observable<LinkPreviewResponse>;
  /** Saves a link; duplicates are allowed ("save anyway"). */
  create(request: CreateLinkRequest): Observable<LinkResponse>;
  /** `GET /api/links`: one cursor page. */
  list(query?: ListLinksQuery): Observable<ListLinksResponse>;
  /** `GET /api/links/recent`: links by `lastOpenedAt` descending. */
  recent(query?: RecentLinksQuery): Observable<RecentLinksResponse>;
  /** `PATCH /api/links/:id`: the updated link. */
  update(id: string, request: UpdateLinkRequest): Observable<LinkResponse>;
  /** `DELETE /api/links/:id`. */
  remove(id: string): Observable<void>;
  /** `POST /api/links/:id/open`: the link with `lastOpenedAt` updated. */
  open(id: string): Observable<OpenLinkResponse>;
}
