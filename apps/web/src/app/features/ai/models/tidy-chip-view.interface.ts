import type { SuggestionKind } from '@shelfmark/contracts';

/** One suggestion chip of a Tidy row (review mode): what it shows and whether it will be applied. */
export interface TidyChipView {
  /** The suggestion's id. */
  readonly id: string;
  readonly kind: SuggestionKind;
  /** The tag or folder name. */
  readonly label: string;
  /** Translation key of the chip's name ("Move to {{name}}, added"), by kind and selection. */
  readonly labelKey: string;
  /** Solid (will be applied) or dashed (left out). */
  readonly selected: boolean;
  /** Folder chips: the tile's colour and glyph as the account shows them. */
  readonly folderColour?: string;
  readonly folderIcon?: string;
}
