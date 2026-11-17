/** A link a prompt is built for: its address and its own id (left out of its examples), if saved. */
export interface SiteExampleTarget {
  url: string;
  linkId: string | null;
}
