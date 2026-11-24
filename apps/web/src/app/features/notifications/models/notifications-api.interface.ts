import type {
  AddNotificationDeviceRequest,
  AddNotificationDeviceResponse,
  NotificationSettingsResponse,
  NotificationTestResponse,
  UpdateNotificationSettings,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/**
 * Seam for Settings › Notifications (`NOTIFICATION_ENDPOINT`, Shelf 05-settings / 12-notify): what
 * Shelfmark may push, the quiet hours, the devices with push on (this browser's Web Push
 * subscription is added with `addDevice`) and a test push. `available` is false while the server
 * has no VAPID keys. Push only: email is postponed.
 */
export interface NotificationsApi {
  get(): Observable<NotificationSettingsResponse>;
  update(change: UpdateNotificationSettings): Observable<NotificationSettingsResponse>;
  /** Stores this browser's push subscription; answers the settings and its device id. */
  addDevice(body: AddNotificationDeviceRequest): Observable<AddNotificationDeviceResponse>;
  /** Turns notifications off for one device. */
  removeDevice(id: string): Observable<NotificationSettingsResponse>;
  /** Sends a sample push to every device of the account. */
  test(): Observable<NotificationTestResponse>;
}
