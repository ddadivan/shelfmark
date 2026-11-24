/** The folder the Export dialog offers next to the whole library (the folder page it was opened on). */
export interface ExportFolderChoice {
  id: string;
  name: string;
  /** Links in the folder (with its subfolders, as the export takes them). */
  count: number;
}
