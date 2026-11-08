import type { FolderDeleteMode, FolderResponse } from '@shelfmark/contracts';

/** What `FolderActionsService` hands to the delete dialog. Counts include the whole subtree. */
export interface DeleteFolderDialogData {
  readonly folder: FolderResponse;
  readonly linkCount: number;
  readonly subfolderCount: number;
  /** Resolves true to close the dialog, false to keep it open with an error. */
  readonly submit: (mode: FolderDeleteMode) => Promise<boolean>;
}
