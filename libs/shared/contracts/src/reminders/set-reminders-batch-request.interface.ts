/** `POST /api/reminders/batch` body: one reminder for several selected links (bulk actions). */
export interface SetRemindersBatchRequest {
  /** 1 to `LINK_LIMIT.BatchMax` distinct link ids; foreign, missing and trashed ids are ignored. */
  ids: string[];
  /** Same rules as `SetReminderRequest.remindAt`; `null` clears the reminders. */
  remindAt: string | null;
}
