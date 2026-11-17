import type { ChromeTab } from './chrome-tab.interface';

/** The part of `chrome.tabs` the popup calls (no `@types/chrome` dependency for two functions). */
export interface ChromeTabsApi {
  query(query: { active: boolean; currentWindow: boolean }): Promise<ChromeTab[]>;
  create(properties: { url: string }): Promise<unknown>;
}
