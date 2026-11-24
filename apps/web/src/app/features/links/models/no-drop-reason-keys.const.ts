import { SIDEBAR_RECENT_ID } from '../../../shell/sidebar/models/sidebar-recent-id.const';
import { SIDEBAR_REMINDERS_ID } from '../../../shell/sidebar/models/sidebar-reminders-id.const';
import { SIDEBAR_TODAY_ID } from '../../../shell/sidebar/models/sidebar-today-id.const';
import { SIDEBAR_TRASH_ID } from '../../../shell/sidebar/models/sidebar-trash-id.const';
import { LINKS_SCOPE } from './links-scope.const';

/**
 * Translation key of the short reason each sidebar row that cannot take links shows while a link
 * is over it (#350), by the row's id (`data-ui-tree-id`).
 */
export const NO_DROP_REASON_KEYS: Readonly<Record<string, string>> = {
  [LINKS_SCOPE.All]: 'links.drag.noDrop.all',
  [LINKS_SCOPE.Favorites]: 'links.drag.noDrop.favorites',
  [SIDEBAR_RECENT_ID]: 'links.drag.noDrop.recent',
  [SIDEBAR_REMINDERS_ID]: 'links.drag.noDrop.reminders',
  // Today holds the due reminders: the same hint.
  [SIDEBAR_TODAY_ID]: 'links.drag.noDrop.reminders',
  [SIDEBAR_TRASH_ID]: 'links.drag.noDrop.trash',
};
