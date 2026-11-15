import type { FolderEmoji, FolderIcon } from '@shelfmark/contracts';

/** The header of a folder page (#418): what the band, the big tile and the cover show. */
export interface FolderBannerView {
  /** The colour as shown (graphite while the account's folder colours are off). */
  readonly colour: string;
  readonly icon: FolderIcon | FolderEmoji;
  readonly description: string | null;
  /** The cover picture (a same-origin path), or `null`. */
  readonly cover: string | null;
}
