import { APP_PATH } from '../models/app-path.const';
import { PHONE_TAB } from './models/phone-tab.const';
import type { PhoneTab } from './models/phone-tab.type';

/**
 * The tab a URL belongs to: Tags and You have their own page, every other signed-in page (the
 * feed, a folder, Recently opened, the Library page) is under Library. Search opens over the page
 * and is never the current tab.
 */
export function phoneTabForUrl(url: string): PhoneTab {
  const first = (url.split(/[?#]/)[0] ?? '').split('/').find(Boolean);
  switch (first) {
    case APP_PATH.Tags:
      return PHONE_TAB.Tags;
    case APP_PATH.Settings:
      return PHONE_TAB.You;
    default:
      return PHONE_TAB.Library;
  }
}
