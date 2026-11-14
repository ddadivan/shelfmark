/** The columns of a `folder_shares` row the owner routes map to `FolderShareResponse`. */
export interface ShareRow {
  folderId: string;
  token: string;
  showNotes: boolean;
  tokenCreatedAt: Date;
}
