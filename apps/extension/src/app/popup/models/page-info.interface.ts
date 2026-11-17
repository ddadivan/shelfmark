/** The tab being saved: only its URL and title ever leave the browser. */
export interface PageInfo {
  url: string;
  title: string;
  /** Host without `www.`, shown above the title. */
  host: string;
}
