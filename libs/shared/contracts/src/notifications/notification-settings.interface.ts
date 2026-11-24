/** What Shelfmark may send and when (Settings › Notifications, Shelf 05-settings). */
export interface NotificationSettings {
  /** A notification when a reminder is due. */
  reminders: boolean;
  /** A nudge for an article left half-read, at most once a day. */
  continueReading: boolean;
  /** "From your shelf", the Sunday email. */
  weeklyEmail: boolean;
  /** Start of the quiet hours, `HH:MM` (24-hour); `null` = no quiet hours. */
  quietFrom: string | null;
  /** End of the quiet hours, `HH:MM` (24-hour). */
  quietTo: string | null;
}
