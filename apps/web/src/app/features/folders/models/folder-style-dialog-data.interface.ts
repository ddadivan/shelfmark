import type { FolderResponse } from '@shelfmark/contracts';
import type { FolderStyleChange } from '../../../stores/models/folder-style-change.type';

/** What `FolderActionsService` hands to the colour and icon dialog. */
export interface FolderStyleDialogData {
  readonly folder: FolderResponse;
  /**
   * Called with the whole chosen style (colour, icon, highlight, description, cover) and the picture of the
   * chosen cover; the caller skips the request when nothing differs. The dialog closes at once.
   */
  readonly submit: (style: Required<FolderStyleChange>, coverUrl: string | null) => void;
  /** Called with the trimmed new name when Save changed it (before `submit`). */
  readonly rename: (name: string) => void;
}
