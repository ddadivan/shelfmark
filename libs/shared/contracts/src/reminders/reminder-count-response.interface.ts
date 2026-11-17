/** `GET /api/reminders/count`: how many live links are due (their `remindAt` has passed). */
export interface ReminderCountResponse {
  due: number;
}
