import type { FolderResponse } from '@shelfmark/contracts';

/** Data of the share dialog: the folder and what its subtree holds. */
export interface ShareFolderDialogData {
  folder: FolderResponse;
  /** Links in the folder and its subfolders. */
  linkCount: number;
  /** Demo accounts cannot share (the switch is off and explains why). */
  isDemo: boolean;
}
