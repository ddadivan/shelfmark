/** The folder columns `toFolderResponse` reads. */
export interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  colour: string;
  icon: string;
  highlighted: boolean;
  description: string | null;
  coverLinkId: string | null;
  position: number;
  pinnedPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
}
