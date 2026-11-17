import { Service } from '@angular/core';
import type { ActiveTab } from './models/active-tab.interface';
import type { ChromeTabsApi } from './models/chrome-tabs-api.interface';

/**
 * The extension API global. Declared here instead of read through `globalThis`: the Chrome Web Store
 * scans the package for `chrome.tabs` calls to confirm that `activeTab` is used (#478), so the calls
 * below must stay literal `chrome.tabs.query` / `chrome.tabs.create`.
 */
declare const chrome: unknown;

function hasTabs(value: unknown): value is { tabs: ChromeTabsApi } {
  if (typeof value !== 'object' || value === null || !('tabs' in value)) return false;
  const { tabs } = value;
  return typeof tabs === 'object' && tabs !== null && 'query' in tabs && 'create' in tabs;
}

/**
 * The browser tab API. `activeTab` gives the URL and title of the tab the popup was opened on and
 * nothing more; `tabs.create` needs no permission. Outside an extension (unit tests, a plain page)
 * there is no tab: `active()` answers `null` and `open()` falls back to `window.open`.
 */
@Service()
export class BrowserTabsService {
  async active(): Promise<ActiveTab | null> {
    if (typeof chrome === 'undefined' || !hasTabs(chrome)) return null;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url === undefined) return null;
    return { url: tab.url, title: tab.title ?? '' };
  }

  /** Opens a page in a new tab and closes the popup. */
  async open(url: string): Promise<void> {
    if (typeof chrome === 'undefined' || !hasTabs(chrome)) {
      globalThis.open(url, '_blank', 'noopener');
    } else {
      await chrome.tabs.create({ url });
    }
    globalThis.close();
  }

  close(): void {
    globalThis.close();
  }
}
