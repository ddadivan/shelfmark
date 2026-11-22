import { Service } from '@angular/core';
import type { ActiveTab } from './models/active-tab.interface';
import type { ChromePermissionsApi } from './models/chrome-permissions-api.interface';
import type { ChromeTabsApi } from './models/chrome-tabs-api.interface';
import type { WindowTab } from './models/window-tab.interface';

/**
 * The extension API global. Declared here instead of read through `globalThis`: the Chrome Web Store
 * scans the package for `chrome.tabs` calls to confirm that `activeTab` is used (#478), so the calls
 * below must stay literal `chrome.tabs.query` / `chrome.tabs.create` / `chrome.tabs.remove` and
 * `chrome.permissions.request` / `chrome.permissions.contains`.
 */
declare const chrome: unknown;

const TABS_PERMISSION = { permissions: ['tabs'] };

function hasTabs(value: unknown): value is { tabs: ChromeTabsApi } {
  if (typeof value !== 'object' || value === null || !('tabs' in value)) return false;
  const { tabs } = value;
  return (
    typeof tabs === 'object' &&
    tabs !== null &&
    'query' in tabs &&
    'create' in tabs &&
    'remove' in tabs
  );
}

function hasPermissions(value: unknown): value is { permissions: ChromePermissionsApi } {
  if (typeof value !== 'object' || value === null || !('permissions' in value)) return false;
  const { permissions } = value;
  return (
    typeof permissions === 'object' &&
    permissions !== null &&
    'request' in permissions &&
    'contains' in permissions
  );
}

/**
 * The browser tab API. `activeTab` gives the URL and title of the tab the popup was opened on and
 * nothing more; `tabs.create` needs no permission. The tabs of the window (save all tabs, #569) need
 * the optional `tabs` permission, asked only when the user switches to "All tabs". Outside an
 * extension (unit tests, a plain page) there is no tab: `active()` answers `null` and `open()` falls
 * back to `window.open`.
 */
@Service()
export class BrowserTabsService {
  async active(): Promise<ActiveTab | null> {
    if (typeof chrome === 'undefined' || !hasTabs(chrome)) return null;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url === undefined) return null;
    return { url: tab.url, title: tab.title ?? '' };
  }

  /** The tabs of the current window. Without `tabs` only the count and ids are known (no url). */
  async windowTabs(): Promise<WindowTab[]> {
    if (typeof chrome === 'undefined' || !hasTabs(chrome)) return [];
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.flatMap((tab) =>
      tab.id === undefined
        ? []
        : [
            {
              id: tab.id,
              active: tab.active === true,
              url: tab.url ?? null,
              title: tab.title ?? '',
              favIconUrl: tab.favIconUrl ?? null,
            },
          ],
    );
  }

  /** Whether the optional `tabs` permission is granted already. */
  async hasTabsPermission(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !hasPermissions(chrome)) return false;
    return chrome.permissions.contains(TABS_PERMISSION);
  }

  /** Chrome's own prompt; `false` when the user declines (or outside an extension). */
  async requestTabsPermission(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !hasPermissions(chrome)) return false;
    return chrome.permissions.request(TABS_PERMISSION);
  }

  /** Closes the given tabs (the user's click on "Close N saved tabs"). */
  async closeTabs(ids: readonly number[]): Promise<void> {
    if (typeof chrome === 'undefined' || !hasTabs(chrome) || ids.length === 0) return;
    await chrome.tabs.remove([...ids]);
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
