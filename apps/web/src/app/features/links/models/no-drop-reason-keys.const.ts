import { SIDEBAR_RECENT_ID } from '../../../shell/sidebar/models/sidebar-recent-id.const';
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
  [SIDEBAR_TRASH_ID]: 'links.drag.noDrop.trash',
};
