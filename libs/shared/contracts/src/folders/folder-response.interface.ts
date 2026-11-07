/** A folder as returned by the API; the frontend builds the tree from `parentId`. */
export interface FolderResponse {
  id: string;
  /** `null` = top-level folder. */
  parentId: string | null;
  name: string;
  /** Links directly in this folder (not in subfolders). */
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}
