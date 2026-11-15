import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  REMINDER_ENDPOINT,
  type LinkResponse,
  type ListRemindersResponse,
  type ReminderCountResponse,
  type SetReminderRequest,
  type SetRemindersBatchRequest,
  type SetRemindersBatchResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { RemindersApi } from '../models/reminders-api.interface';

/** `RemindersApi` over `/api/reminders`. Writes skip the global error toast: the caller says what failed. */
@Service()
export class HttpRemindersApi implements RemindersApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListRemindersResponse> {
    return this.http.get<ListRemindersResponse>(REMINDER_ENDPOINT.Base);
  }

  count(): Observable<ReminderCountResponse> {
    return this.http.get<ReminderCountResponse>(REMINDER_ENDPOINT.Count, {
      context: skipErrorToast(),
    });
  }

  set(linkId: string, remindAt: string): Observable<LinkResponse> {
    const body: SetReminderRequest = { remindAt };
    return this.http.put<LinkResponse>(
      `${REMINDER_ENDPOINT.Base}/${encodeURIComponent(linkId)}`,
      body,
      {
        context: skipErrorToast(),
      },
    );
  }

  clear(linkId: string): Observable<void> {
    return this.http.delete<void>(`${REMINDER_ENDPOINT.Base}/${encodeURIComponent(linkId)}`, {
      context: skipErrorToast(),
    });
  }

  setMany(request: SetRemindersBatchRequest): Observable<SetRemindersBatchResponse> {
    return this.http.post<SetRemindersBatchResponse>(REMINDER_ENDPOINT.Batch, request, {
      context: skipErrorToast(),
    });
  }
}
