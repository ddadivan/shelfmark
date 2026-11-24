import type { NotificationDevice } from './notification-device.interface';
import type { NotificationSettings } from './notification-settings.interface';

/** `GET /api/me/notifications` (and the answer of every write there). */
export interface NotificationSettingsResponse {
  /** False while the server cannot deliver notifications: the page shows the device part only. */
  available: boolean;
  /**
   * The VAPID public key (base64url, uncompressed P-256 point) the browser subscribes with;
   * `null` while `available` is false.
   */
  publicKey: string | null;
  settings: NotificationSettings;
  devices: NotificationDevice[];
}
