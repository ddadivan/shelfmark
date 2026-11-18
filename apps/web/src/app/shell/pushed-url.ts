import { APP_PATH } from '../models/app-path.const';

/** Pages pushed over their tab with a bar of their own at the bottom (the tab bar hides). */
const PUSHED_PATHS: readonly string[] = [`/${APP_PATH.Tidy}`];

/** Whether the URL (query and fragment ignored) is a pushed page. */
export function isPushedUrl(url: string): boolean {
  const path = (url.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');
  return PUSHED_PATHS.includes(path);
}
