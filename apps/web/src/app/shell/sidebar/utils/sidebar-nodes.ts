import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';
import { SIDEBAR_EXTENSION_ID } from '../models/sidebar-extension-id.const';
import { SIDEBAR_DATA_ID } from '../models/sidebar-data-id.const';
import { SIDEBAR_RECENT_ID } from '../models/sidebar-recent-id.const';
import { SIDEBAR_REMINDERS_ID } from '../models/sidebar-reminders-id.const';
import { SIDEBAR_TRASH_ID } from '../models/sidebar-trash-id.const';
import { SIDEBAR_THEME_ID } from '../models/sidebar-theme-id.const';
import type { UiTreeNode } from '@shelfmark/ui';
import type { SidebarLabels } from '../models/sidebar-labels.interface';
import type { SidebarCounts } from '../models/sidebar-counts.interface';
import { sidebarCount } from './sidebar-count';

/**
 * "All links", "Unsorted", "Favorites", "Recently opened", "Reminders"; `counts` null leaves the
 * link counts out. `dueReminders` (undefined = none) is the count of the Reminders row (#275);
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
      id: SIDEBAR_RECENT_ID,
      name: labels.recent,
      icon: 'clock',
      ...(forgottenNote ? { note: forgottenNote } : {}),
    },
    {
      id: SIDEBAR_REMINDERS_ID,
      name: labels.reminders,
      icon: 'bell',
      ...sidebarCount(dueReminders),
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

/** The "Theme" row (Shelf): the icon shows what a press switches to (sun in dark, moon in light). */
export function themeNodes(labels: SidebarLabels, dark: boolean): UiTreeNode[] {
  return [{ id: SIDEBAR_THEME_ID, name: labels.theme, icon: dark ? 'sun' : 'moon' }];
}
