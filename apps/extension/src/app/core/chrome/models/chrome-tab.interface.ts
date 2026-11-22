/**
 * The fields of `chrome.tabs.Tab` the popup uses. `id`, `active` and `windowId`-level facts need no
 * permission; `url`, `title` and `favIconUrl` of tabs other than the one `activeTab` covers need `tabs`.
 */
export interface ChromeTab {
  id?: number;
  active?: boolean;
  url?: string;
  title?: string;
  favIconUrl?: string;
}
