/** `POST /api/imports/:id/undo` response: what went to Trash or was deleted. */
export interface UndoImportResponse {
  /** Links moved to Trash. */
  links: number;
  /** Folders moved to Trash. */
  folders: number;
  /** Tags deleted (created by the import and on no other link). */
  tags: number;
}
