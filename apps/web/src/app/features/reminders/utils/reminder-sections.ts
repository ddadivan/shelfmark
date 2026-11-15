import type { LinkResponse } from '@shelfmark/contracts';
import { REMINDER_GROUP } from '../models/reminder-group.const';
import type { ReminderGroup } from '../models/reminder-group.type';
import type { ReminderSection } from '../models/reminder-section.interface';

const DAYS_PER_WEEK = 7;

/** Local midnight `days` after the day of `now`. */
function midnight(now: Date, days: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days).getTime();
}

/** The group of an upcoming reminder by its local day: today, tomorrow, the next days, later. */
function upcomingGroup(remindAt: string, now: Date): ReminderGroup {
  const at = Date.parse(remindAt);
  if (at < midnight(now, 1)) {
    return REMINDER_GROUP.Today;
  }
  if (at < midnight(now, 2)) {
    return REMINDER_GROUP.Tomorrow;
  }
  return at < midnight(now, DAYS_PER_WEEK) ? REMINDER_GROUP.ThisWeek : REMINDER_GROUP.Later;
}

/**
 * The page sections: "Due" first (as the server lists it), then the upcoming reminders by day
 * (Today, Tomorrow, This week = the next seven days, Later), each soonest first. Empty sections
 * are left out. An upcoming reminder whose time passed while the page was open counts as due.
 */
export function reminderSections(
  due: readonly LinkResponse[],
  upcoming: readonly LinkResponse[],
  now: Date,
): ReminderSection[] {
  const nowIso = now.toISOString();
  const passed = upcoming.filter((link) => (link.remindAt ?? '') <= nowIso);
  const ahead = upcoming.filter((link) => (link.remindAt ?? '') > nowIso);
  const sections: ReminderSection[] = [{ group: REMINDER_GROUP.Due, links: [...due, ...passed] }];
  for (const group of [
    REMINDER_GROUP.Today,
    REMINDER_GROUP.Tomorrow,
    REMINDER_GROUP.ThisWeek,
    REMINDER_GROUP.Later,
  ]) {
    sections.push({
      group,
      links: ahead.filter((link) => upcomingGroup(link.remindAt ?? '', now) === group),
    });
  }
  return sections.filter((section) => section.links.length > 0);
}
