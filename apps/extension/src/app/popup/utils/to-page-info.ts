import { displayHost, isStorableUrl } from '@shelfmark/contracts';
import type { ActiveTab } from '../../core/chrome/models/active-tab.interface';
import type { PageInfo } from '../models/page-info.interface';
import { YOUTUBE_TAB_TITLE } from '../models/youtube-tab-title.const';

/** The tab title worth sending: trimmed, on YouTube without the count and " - YouTube". */
function tabTitle(host: string, raw: string): string {
  const title = raw.trim();
  const youtube: readonly string[] = YOUTUBE_TAB_TITLE.Hosts;
  if (!youtube.includes(host)) return title;
  const cleaned = title.replace(YOUTUBE_TAB_TITLE.Count, '').replace(YOUTUBE_TAB_TITLE.Suffix, '');
  return cleaned.trim().toLowerCase() === YOUTUBE_TAB_TITLE.Generic ? '' : cleaned.trim();
}

/** The tab as a page Shelfmark can save, or `null` for browser pages, files and the new tab page. */
export function toPageInfo(tab: ActiveTab | null): PageInfo | null {
  if (tab === null || !isStorableUrl(tab.url)) return null;
  const host = displayHost(tab.url);
  const title = tabTitle(host, tab.title);
  return { url: tab.url, title: title || host, titleFromTab: title !== '', host };
}
