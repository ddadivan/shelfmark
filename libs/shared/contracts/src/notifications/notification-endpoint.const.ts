/**
 * Notification endpoints (planned, not implemented by `apps/api` yet): delivery needs Web Push
 * (VAPID keys, a push subscription per device, a sender job) and an email sender, which are not
 * small endpoints. Until then the web app's `NOTIFICATIONS_API` HTTP seam answers "not available"
 * without a request.
 */
export const NOTIFICATION_ENDPOINT = {
  Settings: '/api/me/notifications',
  Device: '/api/me/notifications/devices/:id',
} as const;
