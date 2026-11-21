import { APP_PATH } from '../../../models/app-path.const';
import type { RailEntry } from './rail-entry.interface';

/** The fixed entries of the icon rail, in the sidebar's order (#553). */
export const RAIL_ENTRIES: readonly RailEntry[] = [
  { path: `/${APP_PATH.Links}`, icon: 'bookmark', labelKey: 'library.scope.all' },
  { path: `/${APP_PATH.Unsorted}`, icon: 'inbox', labelKey: 'library.scope.unsorted' },
  { path: `/${APP_PATH.Favorites}`, icon: 'star', labelKey: 'library.scope.favorites' },
  { path: `/${APP_PATH.Recent}`, icon: 'clock', labelKey: 'links.recent.title' },
];
