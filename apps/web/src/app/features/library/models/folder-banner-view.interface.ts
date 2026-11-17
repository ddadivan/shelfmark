import type { FolderEmoji, FolderIcon } from '@shelfmark/contracts';

/**
 * The header of a folder page: what the band, the big tile and the cover show (#418), or, while
 * the folder is not highlighted (#440), the description and the cover next to the plain title.
 */
export interface FolderBannerView {
  /** The colour as shown (graphite while the account's folder colours are off). */
  readonly colour: string;
  /** The folder is highlighted: the tinted header block; otherwise the plain title block. */
  readonly highlighted: boolean;
  readonly icon: FolderIcon | FolderEmoji;
  readonly description: string | null;
  /** The cover picture (a same-origin path), or `null`. */
  readonly cover: string | null;
}
