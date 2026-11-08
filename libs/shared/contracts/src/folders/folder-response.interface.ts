/** A folder as returned by the API; the frontend builds the tree from `parentId`. */
export interface FolderResponse {
  id: string;
  /** `null` = top-level folder. */
  parentId: string | null;
  name: string;
  /** Links directly in this folder; links of subfolders are not included (the client sums the subtree). */
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}
