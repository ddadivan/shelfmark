/** A link in the JSON export. `folderPath` is `null` for a link without a folder. */
export interface ExportLink {
  url: string;
  title: string;
  note: string | null;
  isFavorite: boolean;
  folderPath: string[] | null;
  tags: string[];
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
