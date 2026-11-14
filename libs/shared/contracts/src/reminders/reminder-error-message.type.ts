import type { REMINDER_ERROR_MESSAGE } from './reminder-error-message.const';

export type ReminderErrorMessage =
  (typeof REMINDER_ERROR_MESSAGE)[keyof typeof REMINDER_ERROR_MESSAGE];
