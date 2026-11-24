import type { NotificationSettings } from './notification-settings.interface';

/** `PATCH /api/me/notifications`: only the changed fields. */
export type UpdateNotificationSettings = Partial<NotificationSettings>;
