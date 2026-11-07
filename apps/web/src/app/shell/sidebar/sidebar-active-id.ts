import { LINKS_SCOPE } from '../../features/links/models/links-scope.const';
import { APP_PATH } from '../../models/app-path.const';

/**
 * The tree row a URL belongs to: a fixed row (`LINKS_SCOPE.*` is its id) or a folder id;
 * `null` for pages without a row (settings).
 */
export function sidebarActiveId(url: string): string | null {
  const [first, second] = (url.split(/[?#]/)[0] ?? '').split('/').filter(Boolean);
  switch (first) {
    case APP_PATH.Links:
      return LINKS_SCOPE.All;
    case APP_PATH.Unsorted:
      return LINKS_SCOPE.Unsorted;
    case APP_PATH.Favorites:
      return LINKS_SCOPE.Favorites;
    case APP_PATH.Folders:
      return second ? decodeURIComponent(second) : null;
    default:
      return null;
  }
}
