/** The tab being saved: only its URL and title ever leave the browser. */
export interface PageInfo {
  url: string;
  /** The tab title (on YouTube without " - YouTube"), else the host; what the popup shows. */
  title: string;
  /**
   * `false` when the tab had no usable title (blank, or only "YouTube" while a video loads): then
   * no title is sent and the server reads the page's own (a YouTube video's through oEmbed).
   */
  titleFromTab: boolean;
  /** Host without `www.`, shown above the title. */
  host: string;
}
