/** The user's existing link that matches a previewed URL (by normalised URL). */
export interface LinkDuplicate {
  id: string;
  title: string;
  folderId: string | null;
  /** Folder name for the "Already saved in folder X" warning; `null` = "Unsorted". */
  folderName: string | null;
}
