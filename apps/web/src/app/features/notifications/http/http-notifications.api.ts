import { Service } from '@angular/core';
import { NOTIFICATION_DEFAULTS, type NotificationSettingsResponse } from '@shelfmark/contracts';
import { of, type Observable } from 'rxjs';
import type { NotificationsApi } from '../models/notifications-api.interface';

const UNAVAILABLE: NotificationSettingsResponse = {
  available: false,
  settings: NOTIFICATION_DEFAULTS,
  devices: [],
};

/**
 * `NotificationsApi` for the real API. MOCK (Shelf): `apps/api` cannot deliver notifications yet
 * (Web Push needs VAPID keys, a subscription per device and a sender job; the weekly email needs a
 * mail sender), so nothing is stored there and every call answers "not available" without a
 * request. The page then shows only what this device can do (permission and a test).
 */
@Service()
export class HttpNotificationsApi implements NotificationsApi {
  get(): Observable<NotificationSettingsResponse> {
    return of(UNAVAILABLE);
  }

  update(): Observable<NotificationSettingsResponse> {
    return of(UNAVAILABLE);
  }

  removeDevice(): Observable<NotificationSettingsResponse> {
    return of(UNAVAILABLE);
  }
}
