/** Where a grouped link goes: a new folder (its key) or an existing folder (its id). */
export interface ImportGroupPlace {
  readonly folderKey?: string;
  readonly folderId?: string;
}
