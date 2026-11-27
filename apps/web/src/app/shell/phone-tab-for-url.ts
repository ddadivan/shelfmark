import { urlPath } from '../core/routing/url-path';
import { APP_PATH } from '../models/app-path.const';
import { PHONE_TAB } from './models/phone-tab.const';
import type { PhoneTab } from './models/phone-tab.type';

/**
 * The tab a URL belongs to: Today, Library, Tags and Ask have their own page, the settings pages
 * are `You` (no tab of the bar, so none is current there). A page reached from the Library page
 * (the feed, a folder, Recently opened) has no current tab (author, round 11): a lit Library tab
 * there read as "you are on Library", and pressing it did not seem to go anywhere. Search opens
 * over the page and is never the current tab.
 */
export function phoneTabForUrl(url: string): PhoneTab | null {
  const first = urlPath(url).split('/').find(Boolean);
  switch (first) {
    case APP_PATH.Today:
      return PHONE_TAB.Today;
    case APP_PATH.Tags:
      return PHONE_TAB.Tags;
    case APP_PATH.Ask:
      return PHONE_TAB.Ask;
    case APP_PATH.Library:
      return PHONE_TAB.Library;
    case APP_PATH.Settings:
      return PHONE_TAB.You;
    default:
      return null;
  }
}
