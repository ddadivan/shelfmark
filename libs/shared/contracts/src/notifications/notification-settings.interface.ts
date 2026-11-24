/**
 * What Shelfmark may push and when (Settings › Notifications, Shelf 05-settings). Push only: email
 * (the weekly email) is postponed by the author and has no setting.
 */
export interface NotificationSettings {
  /** A notification when a reminder is due. */
  reminders: boolean;
  /** A nudge for an article left half-read, at most once a day (stored; nothing is sent yet). */
  continueReading: boolean;
  /** Start of the quiet hours, `HH:MM` (24-hour); `null` = no quiet hours. */
  quietFrom: string | null;
  /** End of the quiet hours, `HH:MM` (24-hour). */
  quietTo: string | null;
}
