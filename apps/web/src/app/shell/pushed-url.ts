import { APP_PATH } from '../models/app-path.const';
import { PREVIEW_QUERY_PARAM } from '../models/preview-query-param.const';

/**
 * Pages pushed over their tab with a bar of their own at the bottom (the tab bar hides): Tidy
 * Unsorted and Ask your shelf full screen (its composer). The link preview (#553) is pushed over
 * any page while `?preview=` is set.
 */
const PUSHED_PATHS: readonly string[] = [`/${APP_PATH.Tidy}`, `/${APP_PATH.Ask}`];

/** Whether the URL (query and fragment ignored) is a pushed page. */
export function isPushedUrl(url: string): boolean {
  const [beforeFragment = ''] = url.split('#');
  const [rawPath = '', query = ''] = beforeFragment.split('?');
  const path = rawPath.replace(/\/+$/, '');
  return PUSHED_PATHS.includes(path) || new URLSearchParams(query).has(PREVIEW_QUERY_PARAM);
}
