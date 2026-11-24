import type { NotificationSettingsResponse } from './notification-settings-response.interface';

/** `POST /api/me/notifications/devices`: the settings plus the id of the device just added. */
export interface AddNotificationDeviceResponse extends NotificationSettingsResponse {
  deviceId: string;
}
