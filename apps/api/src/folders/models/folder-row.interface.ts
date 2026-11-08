/** The folder columns `toFolderResponse` reads. */
export interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
