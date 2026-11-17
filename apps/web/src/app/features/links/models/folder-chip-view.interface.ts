import type { FolderEmoji, FolderIcon } from '@shelfmark/contracts';

/** The folder of a link as its chip shows it (#418): name, icon and the colour as shown. */
export interface FolderChipView {
  readonly name: string;
  readonly icon: FolderIcon | FolderEmoji;
  /** Graphite while the account's folder colours are off. */
  readonly colour: string;
}
