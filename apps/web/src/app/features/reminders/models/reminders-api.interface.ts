import type { Observable } from 'rxjs';
import type {
  LinkResponse,
  ListRemindersResponse,
  ReminderCountResponse,
  SetRemindersBatchRequest,
  SetRemindersBatchResponse,
} from '@shelfmark/contracts';

/**
 * Seam for the reminder endpoints (`/api/reminders`, #275). `HttpRemindersApi` talks to the REST
 * API; the mock (development and e2e builds) works on the same in-memory library as the links mock.
 */
export interface RemindersApi {
  /** `GET /api/reminders`: due links (the longest due first) and upcoming ones (the soonest first). */
  list(): Observable<ListRemindersResponse>;
  /** `GET /api/reminders/count`: how many links are due. */
  count(): Observable<ReminderCountResponse>;
  /** `PUT /api/reminders/:linkId`: sets or changes the reminder; answers the link. */
  set(linkId: string, remindAt: string): Observable<LinkResponse>;
  /** `DELETE /api/reminders/:linkId`: clears the reminder (Done). */
  clear(linkId: string): Observable<void>;
  /** `POST /api/reminders/batch`: the same reminder (or none) on several links. */
  setMany(request: SetRemindersBatchRequest): Observable<SetRemindersBatchResponse>;
}
