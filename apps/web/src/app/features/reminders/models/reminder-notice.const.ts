import { MS_PER_HOUR } from '../../../core/models/ms-per-hour.const';

/** Timing of the due-reminder toast (`ReminderNoticeService`, Shelf 12-notify). */
export const REMINDER_NOTICE = {
  /** Snooze of the toast: one hour, like the desktop notification's "Snooze 1 hour". */
  SnoozeMs: MS_PER_HOUR,
  /** An open tab waits for an upcoming reminder only this far ahead (the timer is re-armed). */
  WatchMaxMs: 6 * MS_PER_HOUR,
  /** After the due time, so the server already counts the link as due. */
  GraceMs: 2000,
} as const;
