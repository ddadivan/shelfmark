import type {
  NotificationSettingsResponse,
  UpdateNotificationSettings,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/**
 * Seam for Settings › Notifications (`NOTIFICATION_ENDPOINT`, Shelf 05-settings / 12-notify): what
 * Shelfmark may send, the quiet hours and the devices with notifications on. The API cannot
 * deliver notifications yet (Web Push and email are not built): the HTTP implementation answers
 * `available: false` without a request; the mock builds keep the settings on the device.
 */
export interface NotificationsApi {
  get(): Observable<NotificationSettingsResponse>;
  update(change: UpdateNotificationSettings): Observable<NotificationSettingsResponse>;
  /** Turns notifications off for one device. */
  removeDevice(id: string): Observable<NotificationSettingsResponse>;
}
