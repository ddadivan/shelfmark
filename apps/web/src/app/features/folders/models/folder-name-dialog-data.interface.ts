import type { FolderNameMode } from './folder-name-mode.type';

/** What `FolderActionsService` hands to the create / rename dialog. */
export interface FolderNameDialogData {
  readonly mode: FolderNameMode;
  /** Name of the folder a new folder goes into; `null` = top level. Create only. */
  readonly parentName: string | null;
  /** The current name (rename) or empty (create). */
  readonly name: string;
  /**
   * Called with the trimmed name. Resolves true to close the dialog, false to keep it open with
   * an error. Create waits for the server here; rename starts its optimistic update and resolves.
   */
  readonly submit: (name: string) => Promise<boolean>;
}
