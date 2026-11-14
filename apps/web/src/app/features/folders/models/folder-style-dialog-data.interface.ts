import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderStyleChange } from '../../../stores/models/folder-style-change.type';

/** What `FolderActionsService` hands to the colour and icon dialog. */
export interface FolderStyleDialogData {
  readonly folder: FolderResponse;
  /** Links directly in the folder and folders directly inside it, for the preview line. */
  readonly linkCount: number;
  readonly subfolderCount: number;
  /**
   * Called with the whole chosen style (colour, icon, description); the caller skips the request
   * when nothing differs. The dialog closes at once.
   */
  readonly submit: (style: Required<FolderStyleChange>) => void;
}
