import type { NotificationSettings } from './notification-settings.interface';

/** A new account: reminders on, the rest off, no quiet hours. */
export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  reminders: true,
  continueReading: false,
  weeklyEmail: false,
  quietFrom: null,
  quietTo: null,
};
