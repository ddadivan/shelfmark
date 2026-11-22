/** One savable tab of the window in "All tabs" mode. Addresses and titles stay in the browser until Save. */
export interface TabEntry {
  /** The normalised address: tabs with the same one are listed once. */
  key: string;
  tabId: number;
  url: string;
  /** The tab title, else the host (what the row shows). */
  title: string;
  /** `false` without a usable title: none is sent and the server reads the page's. */
  titleFromTab: boolean;
  /** Host without `www.`. */
  host: string;
  /** First letter of the host, the favicon fallback. */
  letter: string;
  /** The tab's icon address, sent to the server as a hint only (the popup CSP blocks showing it). */
  faviconUrl: string | null;
  /** Already in the library (the lookup said so): unticked at first, "Saved" badge. */
  saved: boolean;
  /** One per tab, kept across retries, so a repeated batch never creates copies. */
  idempotencyKey: string;
}
