/** One of the sites the user saves most (`MeStatsResponse.topSites`). */
export interface MeStatsSite {
  /** Lower-case host without `www.` (`github.com`). */
  host: string;
  /** Live links (not in Trash) on this host. */
  count: number;
  /**
   * Same-origin path of a captured favicon of the newest link on this host that has one
   * (`/api/links/:id/favicon?v=…`), else `null` (the UI shows the site letter).
   */
  faviconUrl: string | null;
}
