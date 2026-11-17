import type { REMINDER_GROUP } from './reminder-group.const';

export type ReminderGroup = (typeof REMINDER_GROUP)[keyof typeof REMINDER_GROUP];
