import type { Observable } from 'rxjs';
import type {
  CreateSavedViewRequest,
  ListSavedViewsQuery,
  ListSavedViewsResponse,
  SavedViewResponse,
  UpdateSavedViewRequest,
} from '@shelfmark/contracts';

/** Seam for the saved views (`/api/views`): at most `SAVED_VIEW_LIMIT.PerUserMax`, in one order, with counts. */
export interface SavedViewsApi {
  /** `GET /api/views`: the views in order with their counts, plus all live links (`total`); with a feed the counts are those inside it (#335). */
  list(feed?: ListSavedViewsQuery): Observable<ListSavedViewsResponse>;
  /** `POST /api/views`: adds at the end; 404 for a missing folder, 409 beyond the limit. */
  create(request: CreateSavedViewRequest): Observable<SavedViewResponse>;
  /** `PATCH /api/views/:id`. */
  update(id: string, request: UpdateSavedViewRequest): Observable<SavedViewResponse>;
  /** `DELETE /api/views/:id`. */
  remove(id: string): Observable<void>;
  /** `PUT /api/views/order`: every view once, in the new order. */
  reorder(ids: readonly string[]): Observable<ListSavedViewsResponse>;
}
