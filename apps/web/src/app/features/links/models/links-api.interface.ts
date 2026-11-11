import type { Observable } from 'rxjs';
import type {
  CaptureLinkImagesResponse,
  CreateLinkRequest,
  CreateLinksBatchRequest,
  CreateLinksBatchResponse,
  DeleteLinksBatchResponse,
  GetLinkResponse,
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
  /** `DELETE /api/links/recent/:id`: removes one link from the history (the link stays saved). */
  removeRecent(id: string): Observable<void>;
  /** `DELETE /api/links/recent`: clears the whole history. */
  clearRecent(): Observable<void>;
  /** `GET /api/links/:id`: one link (an "open saved" target that is not in the feed). */
  get(id: string): Observable<GetLinkResponse>;
  /** `PATCH /api/links/:id`: the updated link. */
  update(id: string, request: UpdateLinkRequest): Observable<LinkResponse>;
  /** `DELETE /api/links/:id`. */
  remove(id: string): Observable<void>;
  /** `POST /api/links/:id/open`: the link with `lastOpenedAt` updated. */
  open(id: string): Observable<OpenLinkResponse>;
  /**
   * `POST /api/links/:id/images/capture`: re-captures the images of a link whose page changed
   * (its image paths carry the pending marker). Answers with the link as it is afterwards.
   */
  captureImages(id: string): Observable<CaptureLinkImagesResponse>;
  /**
   * `POST /api/links/batch`: saves several links in one request (paste many). Answers the saved
   * links in request order (created or replayed by key) and the skipped items.
   */
  createBatch(request: CreateLinksBatchRequest): Observable<CreateLinksBatchResponse>;
  /** `POST /api/links/batch/delete`: deletes several of the user's links (Undo of a batch). */
  removeBatch(ids: readonly string[]): Observable<DeleteLinksBatchResponse>;
}
