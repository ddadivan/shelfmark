/** One group of a `count_links` answer. */
export interface AskCountGroup {
  /** Folder path, tag name, site, kind or `YYYY-MM` (UTC); `(unsorted)` for links without a folder. */
  label: string;
  count: number;
}
