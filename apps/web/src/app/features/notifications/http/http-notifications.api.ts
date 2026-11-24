import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  NOTIFICATION_ENDPOINT,
  type AddNotificationDeviceRequest,
  type AddNotificationDeviceResponse,
  type NotificationSettingsResponse,
  type NotificationTestResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { NotificationsApi } from '../models/notifications-api.interface';

/**
 * `NotificationsApi` over `NOTIFICATION_ENDPOINT`. The page shows its own failure toasts (and the
 * push subscription runs in the background), so the global error toast is skipped.
 */
@Service()
export class HttpNotificationsApi implements NotificationsApi {
  private readonly http = inject(HttpClient);

  get(): Observable<NotificationSettingsResponse> {
    return this.http.get<NotificationSettingsResponse>(NOTIFICATION_ENDPOINT.Settings, {
      context: skipErrorToast(),
    });
  }

  update(change: UpdateNotificationSettings): Observable<NotificationSettingsResponse> {
    return this.http.patch<NotificationSettingsResponse>(NOTIFICATION_ENDPOINT.Settings, change, {
      context: skipErrorToast(),
    });
  }

  addDevice(body: AddNotificationDeviceRequest): Observable<AddNotificationDeviceResponse> {
    return this.http.post<AddNotificationDeviceResponse>(NOTIFICATION_ENDPOINT.Devices, body, {
      context: skipErrorToast(),
    });
  }

  removeDevice(id: string): Observable<NotificationSettingsResponse> {
    return this.http.delete<NotificationSettingsResponse>(
      NOTIFICATION_ENDPOINT.Device.replace(':id', encodeURIComponent(id)),
      { context: skipErrorToast() },
    );
  }

  test(): Observable<NotificationTestResponse> {
    return this.http.post<NotificationTestResponse>(
      NOTIFICATION_ENDPOINT.Test,
      {},
      { context: skipErrorToast() },
    );
  }
}
