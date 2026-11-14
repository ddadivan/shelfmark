import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';
import { SIDEBAR_FEEDBACK_ID } from '../models/sidebar-feedback-id.const';
import { SIDEBAR_RECENT_ID } from '../models/sidebar-recent-id.const';
import { SIDEBAR_REMINDERS_ID } from '../models/sidebar-reminders-id.const';
import { SIDEBAR_TRASH_ID } from '../models/sidebar-trash-id.const';
import type { UiTreeNode } from '@shelfmark/ui';
import type { SidebarLabels } from '../models/sidebar-labels.interface';
import type { SidebarCounts } from '../models/sidebar-counts.interface';
import { sidebarCount } from './sidebar-count';

/**
 * "All links", "Unsorted", "Favorites", "Recently opened", "Reminders"; `counts` null leaves the
 * link counts out. `dueReminders` (undefined = none) is the count of the Reminders row (#275).
 */
export function fixedNodes(
  labels: SidebarLabels,
  counts: Readonly<SidebarCounts> | null,
  dueReminders?: number,
): UiTreeNode[] {
  return [
    { id: LINKS_SCOPE.All, name: labels.all, icon: 'bookmark', ...sidebarCount(counts?.all) },
    {
      id: LINKS_SCOPE.Unsorted,
      name: labels.unsorted,
      icon: 'inbox',
      ...sidebarCount(counts?.unsorted),
    },
    {
      id: LINKS_SCOPE.Favorites,
      name: labels.favorites,
      icon: 'star',
      ...sidebarCount(counts?.favorites),
    },
    { id: SIDEBAR_RECENT_ID, name: labels.recent, icon: 'clock' },
    {
      id: SIDEBAR_REMINDERS_ID,
      name: labels.reminders,
      icon: 'bell',
      ...sidebarCount(dueReminders),
    },
  ];
}

/** The "Send feedback" row above the divider. */
export function feedbackNodes(labels: SidebarLabels): UiTreeNode[] {
  return [{ id: SIDEBAR_FEEDBACK_ID, name: labels.feedback, icon: 'message' }];
}

/** The Trash row under the divider; `total` undefined shows no count. */
export function trashNodes(labels: SidebarLabels, total: number | undefined): UiTreeNode[] {
  return [{ id: SIDEBAR_TRASH_ID, name: labels.trash, icon: 'trash', ...sidebarCount(total) }];
}
