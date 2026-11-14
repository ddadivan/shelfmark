import type { LinkResponse } from '@shelfmark/contracts';
import type { ReminderGroup } from './reminder-group.type';

/** One section of the Reminders page: its group and its links, soonest first. */
export interface ReminderSection {
  group: ReminderGroup;
  links: LinkResponse[];
}
