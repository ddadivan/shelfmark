import type { LinkPreviewResponse } from '@shelfmark/contracts';

/** One answer of `loadPreviews`: the preview of a pasted link, or `null` when it failed. */
export interface PastePreviewResult {
  readonly url: string;
  readonly response: LinkPreviewResponse | null;
  /** The preview endpoint answered 429: no further previews are requested for this paste. */
  readonly stopped: boolean;
}
