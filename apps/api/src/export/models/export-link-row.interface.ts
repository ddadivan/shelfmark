/** A link as the export reads it from the database. */
export interface ExportLinkRow {
  id: string;
  url: string;
  title: string;
  kind: string;
  note: string | null;
  isFavorite: boolean;
  folderId: string | null;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: { name: string } }[];
}
