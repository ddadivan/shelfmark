import type { FolderColour } from './folder-colour.type';
import type { HexColour } from '../users/hex-colour.type';
import type { FolderEmoji } from './folder-emoji.type';
import type { FolderIcon } from './folder-icon.type';

/** A folder as returned by the API; the frontend builds the tree from `parentId` and `position`. */
export interface FolderResponse {
  id: string;
  /** `null` = top-level folder. */
  parentId: string | null;
  name: string;
  /** One of `FOLDER_COLOUR` or an own colour as lower-case `#rrggbb` (#335); `graphite` until chosen. Show graphite everywhere when the account setting `folderColours` is off. */
  colour: FolderColour | HexColour;
  /** One of `FOLDER_ICON` or exactly one emoji (#335); `folder` until chosen. */
  icon: FolderIcon | FolderEmoji;
  /**
   * Place among its siblings (the manual order of `PUT /api/folders/order`, 0 first). Lists are
   * sorted by it, then by name; a new or moved folder goes to the end of its parent.
   */
  position: number;
  /** Pinned to the sidebar (see `/api/pins`). */
  pinned: boolean;
  /** Links directly in this folder; links of subfolders are not included (the client sums the subtree). */
  linkCount: number;
  createdAt: string;
  updatedAt: string;
}
