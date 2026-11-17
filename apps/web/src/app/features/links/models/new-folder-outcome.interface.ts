/** What became of the folder of the add-link form when the link was saved (#454). */
export interface NewFolderOutcome {
  /** The folder id to save the link with; `null` is "Unsorted". */
  readonly folderId: string | null;
  /** The name of a new folder that could not be created; `null` when nothing failed. */
  readonly failedName: string | null;
}
