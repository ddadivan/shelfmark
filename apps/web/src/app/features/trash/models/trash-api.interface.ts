import type { Observable } from 'rxjs';
import type { ListTrashResponse, TrashActionResponse, TrashItemRef } from '@shelfmark/contracts';

/**
 * Seam for the Trash endpoints (`/api/trash`). `HttpTrashApi` talks to the REST API; the mock
 * (development and e2e builds) works on the same in-memory library as the links and folders mocks.
 */
export interface TrashApi {
  /** `GET /api/trash`: the newest entries, newest first, with the total and the retention. */
  list(): Observable<ListTrashResponse>;
  /** `POST /api/trash/restore`: puts the entries back (a link whose folder is gone goes to Unsorted). */
  restore(items: readonly TrashItemRef[]): Observable<TrashActionResponse>;
  /** `POST /api/trash/delete`: deletes the entries for good. */
  deleteForever(items: readonly TrashItemRef[]): Observable<TrashActionResponse>;
  /** `DELETE /api/trash`: deletes everything in Trash for good. */
  empty(): Observable<TrashActionResponse>;
}
