/** The fields of `chrome.tabs.Tab` the popup uses; with `activeTab` they are set for the current tab. */
export interface ChromeTab {
  url?: string;
  title?: string;
}
