/** Preview data extracted from a page; the request/response wrapper arrives with the links module. */
export interface LinkPreview {
  /** Final URL after redirects; the input URL when the page could not be fetched. */
  url: string;
  /** Page title (at most 300 characters); the URL when none could be extracted. */
  title: string;
  description: string | null;
  /** Absolute http(s) URL of the Open Graph / Twitter image. */
  imageUrl: string | null;
  /** Absolute http(s) URL of the site icon. */
  faviconUrl: string | null;
}
