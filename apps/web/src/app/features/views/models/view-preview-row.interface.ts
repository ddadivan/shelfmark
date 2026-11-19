/** One of the first links a new view would list. */
export interface ViewPreviewRow {
  id: string;
  title: string;
  host: string;
  /** Name of its folder, `null` in Unsorted. */
  folder: string | null;
  faviconUrl: string | null;
}
