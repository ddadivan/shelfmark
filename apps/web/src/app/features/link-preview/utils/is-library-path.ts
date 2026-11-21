import { APP_PATH } from '../../../models/app-path.const';

const FEEDS: readonly string[] = [
  `/${APP_PATH.Links}`,
  `/${APP_PATH.Unsorted}`,
  `/${APP_PATH.Favorites}`,
];
const FOLDER = new RegExp(`^/${APP_PATH.Folders}/[^/]+$`);

/**
 * Whether a router path (no query or fragment) is a library feed, the only page that shows the
 * link preview (#553): All links, Unsorted, Favorites and a folder.
 */
export function isLibraryPath(path: string): boolean {
  const trimmed = path.replace(/\/+$/, '');
  return FEEDS.includes(trimmed) || FOLDER.test(trimmed);
}
