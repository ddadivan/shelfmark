/** A folder as the export reads it from the database. */
export interface ExportFolderRow {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
