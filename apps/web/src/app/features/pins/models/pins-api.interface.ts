import type { Observable } from 'rxjs';
import type { ListPinsResponse, PinRef } from '@shelfmark/contracts';

/** Seam for the sidebar pins (`/api/pins`): at most `PIN_LIMIT.Max` folders and links, in one order. */
export interface PinsApi {
  /** `GET /api/pins`: the pinned items in sidebar order. */
  list(): Observable<ListPinsResponse>;
  /** `POST /api/pins`: pins at the end (idempotent); 404 for a missing target, 409 beyond the limit. */
  create(ref: PinRef): Observable<ListPinsResponse>;
  /** `DELETE /api/pins/:kind/:id`. */
  remove(ref: PinRef): Observable<void>;
  /** `PUT /api/pins/order`: every pinned item once, in the new order. */
  reorder(refs: readonly PinRef[]): Observable<ListPinsResponse>;
}
