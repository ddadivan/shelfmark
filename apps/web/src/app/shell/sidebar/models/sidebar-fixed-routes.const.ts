import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';
import { APP_PATH } from '../../../models/app-path.const';
import { SIDEBAR_RECENT_ID } from './sidebar-recent-id.const';
import { SIDEBAR_REMINDERS_ID } from './sidebar-reminders-id.const';
import { SIDEBAR_TODAY_ID } from './sidebar-today-id.const';

/** The fixed rows and their routes. */
export const SIDEBAR_FIXED_ROUTES: Readonly<Record<string, string>> = {
  [LINKS_SCOPE.All]: APP_PATH.Links,
  [LINKS_SCOPE.Unsorted]: APP_PATH.Unsorted,
  [LINKS_SCOPE.Favorites]: APP_PATH.Favorites,
  [SIDEBAR_RECENT_ID]: APP_PATH.Recent,
  [SIDEBAR_REMINDERS_ID]: APP_PATH.Reminders,
  [SIDEBAR_TODAY_ID]: APP_PATH.Today,
};
