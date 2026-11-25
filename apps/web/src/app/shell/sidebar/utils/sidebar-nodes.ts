import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';
import { SIDEBAR_EXTENSION_ID } from '../models/sidebar-extension-id.const';
import { SIDEBAR_DATA_ID } from '../models/sidebar-data-id.const';
import { SIDEBAR_RECENT_ID } from '../models/sidebar-recent-id.const';
import { SIDEBAR_TODAY_ID } from '../models/sidebar-today-id.const';
import { SIDEBAR_TRASH_ID } from '../models/sidebar-trash-id.const';
import type { UiTreeNode } from '@shelfmark/ui';
import type { SidebarLabels } from '../models/sidebar-labels.interface';
import type { SidebarCounts } from '../models/sidebar-counts.interface';
import { sidebarCount } from './sidebar-count';

/**
 * "All links", "Unsorted", "Favorites", "Today", "Recently opened" (Shelf); `counts` null leaves the
 * link counts out. `dueReminders` (undefined = none) is the count of the Today row, whose "Back to
 * these" holds the due reminders (#275; the Reminders page is its "Revisit");
 * `forgottenNote` ("5 forgotten", undefined = none) is the note of the Recently opened row (#512).
 */
export function fixedNodes(
  labels: SidebarLabels,
  counts: Readonly<SidebarCounts> | null,
  dueReminders?: number,
  forgottenNote?: string,
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
    {
      id: SIDEBAR_TODAY_ID,
      name: labels.today,
      icon: 'history',
      ...sidebarCount(dueReminders),
    },
    {
      id: SIDEBAR_RECENT_ID,
      name: labels.recent,
      icon: 'clock',
      ...(forgottenNote ? { note: forgottenNote } : {}),
    },
  ];
}

/** "Get the extension" above the data row once the library banner was closed (#455). */
export function extensionNodes(labels: SidebarLabels, shown = false): UiTreeNode[] {
  return shown ? [{ id: SIDEBAR_EXTENSION_ID, name: labels.extension, icon: 'download' }] : [];
}

/**
 * The one "Data & help" row (#387) that opens the menu of Import, Export, What's new and Send
 * feedback; it carries the dot while a release is unseen (#424).
 */
export function dataNodes(labels: SidebarLabels, whatsNewUnseen = false): UiTreeNode[] {
  return [
    {
      id: SIDEBAR_DATA_ID,
      name: labels.data,
      icon: 'more',
      ...(whatsNewUnseen ? { dot: labels.whatsNewDot } : {}),
    },
  ];
}

/** The Trash row under the divider; `total` undefined shows no count. */
export function trashNodes(labels: SidebarLabels, total: number | undefined): UiTreeNode[] {
  return [{ id: SIDEBAR_TRASH_ID, name: labels.trash, icon: 'trash', ...sidebarCount(total) }];
}
