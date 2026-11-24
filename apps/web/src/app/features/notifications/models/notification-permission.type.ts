import type { NOTIFICATION_PERMISSION } from './notification-permission.const';

export type NotificationPermissionState =
  (typeof NOTIFICATION_PERMISSION)[keyof typeof NOTIFICATION_PERMISSION];
