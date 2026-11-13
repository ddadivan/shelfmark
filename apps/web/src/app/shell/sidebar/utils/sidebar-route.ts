import { APP_PATH } from '../../../models/app-path.const';
import { SIDEBAR_FIXED_ROUTES } from '../models/sidebar-fixed-routes.const';

/** The router commands of a tree row: a fixed row's page, or the folder with that id. */
export function sidebarRoute(id: string): string[] {
  const fixed = SIDEBAR_FIXED_ROUTES[id];
  return fixed ? [`/${fixed}`] : [`/${APP_PATH.Folders}`, id];
}
