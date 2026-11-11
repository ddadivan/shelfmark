import type { FolderColour } from './folder-colour.type';
import type { FolderIcon } from './folder-icon.type';

/** A folder as returned by the API; the frontend builds the tree from `parentId`. */
export interface FolderResponse {
  id: string;
  /** `null` = top-level folder. */
  parentId: string | null;
  name: string;
  /** One of `FOLDER_COLOUR`; `graphite` until chosen. Show graphite everywhere when the account setting `folderColours` is off. */
  colour: FolderColour;
  /** One of `FOLDER_ICON`; `folder` until chosen. */
  icon: FolderIcon;
  /** Pinned to the sidebar (see `/api/pins`). */
  pinned: boolean;
  /** Links directly in this folder; links of subfolders are not included (the client sums the subtree). */
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}
