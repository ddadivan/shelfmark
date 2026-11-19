import type { ViewPreviewRow } from './view-preview-row.interface';

/** What a new view would list now. */
export interface ViewPreview {
  /** Links found; with `more` it is the size of the page that was read. */
  count: number;
  /** More links follow the page that was read: the count is "at least". */
  more: boolean;
  rows: ViewPreviewRow[];
}
