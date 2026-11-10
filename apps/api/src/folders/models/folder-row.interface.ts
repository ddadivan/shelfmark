/** The folder columns `toFolderResponse` reads. */
export interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  colour: string;
  icon: string;
  pinnedPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
}
