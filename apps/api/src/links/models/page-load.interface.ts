import type { LinkPreview } from '@shelfmark/contracts';

/** Result of loading a page for a preview: the data, and whether it came from the page. */
export interface PageLoad {
  preview: LinkPreview;
  /** `false` when the fallback (the URL as title) was used. */
  fetched: boolean;
}
