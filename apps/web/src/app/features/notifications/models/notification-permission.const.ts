/** Where this browser stands on notifications (`Notification.permission`, plus no support). */
export const NOTIFICATION_PERMISSION = {
  Default: 'default',
  Granted: 'granted',
  Denied: 'denied',
  Unsupported: 'unsupported',
} as const;
