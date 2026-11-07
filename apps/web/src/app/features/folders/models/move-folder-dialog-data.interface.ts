import type { FolderResponse } from '@shelfmark/contracts';

/** What `FolderActionsService` hands to the move dialog. */
export interface MoveFolderDialogData {
  readonly folder: FolderResponse;
  /** Called with the chosen parent (`null` = top level) and closes the dialog; the move itself is optimistic. */
  readonly submit: (parentId: string | null) => void;
}
