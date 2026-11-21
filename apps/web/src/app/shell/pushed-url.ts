import { APP_PATH } from '../models/app-path.const';
import { previewIdOfUrl } from '../features/link-preview/utils/preview-id-of-url';

/**
 * Pages pushed over their tab with a bar of their own at the bottom (the tab bar hides): Tidy
 * Unsorted and Ask your shelf full screen (its composer). The link preview (#553) is pushed over
 * a library feed while `?preview=` is set.
 */
const PUSHED_PATHS: readonly string[] = [`/${APP_PATH.Tidy}`, `/${APP_PATH.Ask}`];

/** Whether the URL (query and fragment ignored) is a pushed page. */
export function isPushedUrl(url: string): boolean {
  const path = (url.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');
  return PUSHED_PATHS.includes(path) || previewIdOfUrl(url) !== null;
}
