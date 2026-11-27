import { urlPath } from '../../../core/routing/url-path';
import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';
import { APP_PATH } from '../../../models/app-path.const';
import { SIDEBAR_RECENT_ID } from '../models/sidebar-recent-id.const';
import { SIDEBAR_TODAY_ID } from '../models/sidebar-today-id.const';
import { SIDEBAR_TRASH_ID } from '../models/sidebar-trash-id.const';

/**
 * The tree row a URL belongs to: a fixed row (`LINKS_SCOPE.*` is its id, `SIDEBAR_RECENT_ID` the
 * "Recently opened" row, `SIDEBAR_TRASH_ID` the Trash row) or a folder id; `null` for pages without a row (settings).
 */
export function sidebarActiveId(url: string): string | null {
  const [first, second] = urlPath(url).split('/').filter(Boolean);
  switch (first) {
    case APP_PATH.Links:
      return LINKS_SCOPE.All;
    case APP_PATH.Unsorted:
      return LINKS_SCOPE.Unsorted;
    case APP_PATH.Favorites:
      return LINKS_SCOPE.Favorites;
    case APP_PATH.Recent:
      return SIDEBAR_RECENT_ID;
    // The Reminders page is the "Revisit" of Today (Shelf): its row stays current there.
    case APP_PATH.Today:
    case APP_PATH.Reminders:
      return SIDEBAR_TODAY_ID;
    case APP_PATH.Trash:
      return SIDEBAR_TRASH_ID;
    case APP_PATH.Folders:
      return second ? decodeURIComponent(second) : null;
    default:
      return null;
  }
}
