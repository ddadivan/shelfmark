import { isHttpUrl, isStorableUrl, LINK_LIMIT, normalizeUrl } from '@shelfmark/contracts';
import type { WindowTab } from '../../core/chrome/models/window-tab.interface';
import type { TabEntry } from '../models/tab-entry.interface';
import { toPageInfo } from './to-page-info';

/**
 * The tabs of the window as the list of "All tabs": only http(s) pages (browser pages, files and
 * blank tabs stay out), one entry per normalised address (the first tab wins), the tab the popup
 * was opened on first, at most `LINK_LIMIT.BatchMax`. A tab without an address (no `tabs`
 * permission) is left out.
 */
export function toTabEntries(tabs: readonly WindowTab[]): TabEntry[] {
  const ordered = [...tabs].sort((a, b) => Number(b.active) - Number(a.active));
  const seen = new Set<string>();
  const entries: TabEntry[] = [];
  for (const tab of ordered) {
    if (tab.url === null || !isStorableUrl(tab.url)) continue;
    const page = toPageInfo({ url: tab.url, title: tab.title });
    if (page === null) continue;
    const key = normalizeUrl(tab.url);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      key,
      tabId: tab.id,
      url: tab.url,
      title: page.title,
      titleFromTab: page.titleFromTab,
      host: page.host,
      letter: Array.from(page.host)[0]?.toUpperCase() ?? '',
      faviconUrl: tab.favIconUrl !== null && isHttpUrl(tab.favIconUrl) ? tab.favIconUrl : null,
      saved: false,
      idempotencyKey: crypto.randomUUID(),
    });
    if (entries.length >= LINK_LIMIT.BatchMax) break;
  }
  return entries;
}
