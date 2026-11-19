import type { ImportLinkItem } from './import-link-item.interface';

/** `POST /api/imports/:id/links` body: one batch, saved in one transaction. */
export interface ImportLinksRequest {
  /** 1 to `LINK_LIMIT.BatchMax` links. */
  items: ImportLinkItem[];
  /** `false` keeps repeats of a URL within the batch ("Skip duplicates" off); default `true`. */
  skipRepeats?: boolean;
}
