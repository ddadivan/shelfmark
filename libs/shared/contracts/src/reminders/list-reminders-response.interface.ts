import type { LinkResponse } from '../links/link-response.interface';

/** `GET /api/reminders`: the user's live links with a reminder, soonest first in each group. */
export interface ListRemindersResponse {
  /** `remindAt` has passed: the link is due. At most `REMINDER_LIMIT.ListMax`. */
  due: LinkResponse[];
  /** `remindAt` is still ahead. At most `REMINDER_LIMIT.ListMax`. */
  upcoming: LinkResponse[];
}
