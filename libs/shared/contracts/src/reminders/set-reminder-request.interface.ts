/** `PUT /api/reminders/:linkId` body: when to bring the link back. Replaces an earlier reminder. */
export interface SetReminderRequest {
  /**
   * ISO 8601 time with an offset (`2026-11-16T09:00:00.000Z`), in the future and at most
   * `REMINDER_LIMIT.MaxAheadDays` ahead (`REMINDER_ERROR_MESSAGE` names the problem, 400).
   */
  remindAt: string;
}
