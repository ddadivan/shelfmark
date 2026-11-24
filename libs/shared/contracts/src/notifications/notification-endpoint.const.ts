/**
 * Settings › Notifications (Shelf 05-settings / 12-notify). `Settings` answers what may be sent,
 * the quiet hours, the devices and whether the server can deliver Web Push at all (`available`,
 * false while the VAPID keys are not configured). `Devices` adds this browser's push subscription;
 * `Device` removes one; `Test` sends a sample notification to every device of the account.
 */
export const NOTIFICATION_ENDPOINT = {
  Settings: '/api/me/notifications',
  Devices: '/api/me/notifications/devices',
  Device: '/api/me/notifications/devices/:id',
  Test: '/api/me/notifications/test',
} as const;
