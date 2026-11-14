import type { FolderNameMode } from './folder-name-mode.type';

/** What `FolderActionsService` hands to the create / rename dialog. */
export interface FolderNameDialogData {
  readonly mode: FolderNameMode;
  /** Id of the folder a new folder starts in (the "Inside" field); `null` = top level. Create only. */
  readonly parentId: string | null;
  /** The current name (rename) or empty (create). */
  readonly name: string;
  /**
   * Called with the trimmed name and the chosen parent (create only; rename passes `null`). Resolves true to close the dialog, false to keep it open with
   * an error. Create waits for the server here; rename starts its optimistic update and resolves.
   */
  readonly submit: (name: string, parentId: string | null) => Promise<boolean>;
}
