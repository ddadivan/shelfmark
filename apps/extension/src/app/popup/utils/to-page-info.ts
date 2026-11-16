import { isHttpUrl } from '@shelfmark/contracts';
import type { ActiveTab } from '../../core/chrome/models/active-tab.interface';
import type { PageInfo } from '../models/page-info.interface';

/** The tab as a page Shelfmark can save, or `null` for browser pages, files and the new tab page. */
export function toPageInfo(tab: ActiveTab | null): PageInfo | null {
  if (tab === null || !isHttpUrl(tab.url)) return null;
  const host = new URL(tab.url).hostname.replace(/^www\./u, '');
  return { url: tab.url, title: tab.title.trim() || host, host };
}
