import type {
  FolderColour,
  FolderEmoji,
  FolderIcon,
  FolderResponse,
  HexColour,
} from '@shelfmark/contracts';

/** What `FolderActionsService` hands to the colour and icon dialog. */
export interface FolderStyleDialogData {
  readonly folder: FolderResponse;
  /** Links directly in the folder and folders directly inside it, for the preview line. */
  readonly linkCount: number;
  readonly subfolderCount: number;
  /** Called with the chosen style when it differs from the current one; the dialog closes at once. */
  readonly submit: (style: {
    colour: FolderColour | HexColour;
    icon: FolderIcon | FolderEmoji;
  }) => void;
}
