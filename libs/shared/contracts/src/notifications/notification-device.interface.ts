/** A browser or device that has notifications turned on for the account. */
export interface NotificationDevice {
  id: string;
  /** Readable name made from the browser and the system, e.g. "Chrome on macOS". */
  name: string;
  /** ISO time notifications were turned on there. */
  createdAt: string;
  /** ISO time the last notification was handed to its push service; `null` = none yet. */
  lastUsedAt: string | null;
}
