import type { SuggestionKind } from '@shelfmark/contracts';

/** One suggestion chip as a row draws it: the texts come translated (`AddLinkAiService`). */
export interface AiChipView {
  /** The suggestion's id. */
  readonly id: string;
  readonly kind: SuggestionKind;
  /** The tag or folder name. */
  readonly label: string;
  /** What a click does: "Add tag signals", "Move to Angular". */
  readonly ariaLabel: string;
  /** The x: "Dismiss suggestion signals". */
  readonly dismissLabel: string;
  /** Said politely once it is applied: "Tag signals added". */
  readonly acceptedMessage: string;
  /** Folder chips: the tile's colour and glyph as the account shows them. */
  readonly folderColour?: string;
  readonly folderIcon?: string;
}
