import type { NotificationDevice } from './notification-device.interface';
import type { NotificationSettings } from './notification-settings.interface';

/** `GET /api/me/notifications`. */
export interface NotificationSettingsResponse {
  /** False while the server cannot deliver notifications: the page shows the device part only. */
  available: boolean;
  settings: NotificationSettings;
  devices: NotificationDevice[];
}
