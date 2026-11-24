import { APP_PATH } from '../../../models/app-path.const';

/**
 * First URL segments of the library feeds that search in place (`?q=`): All links, Unsorted,
 * Favorites and a folder. Typing on any other page opens All links with the text.
 */
export const FEED_SEARCH_PATHS: readonly string[] = [
  APP_PATH.Links,
  APP_PATH.Unsorted,
  APP_PATH.Favorites,
  APP_PATH.Folders,
];
