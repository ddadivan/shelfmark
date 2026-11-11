import type { FolderColour } from './folder-colour.type';
import type { FolderIcon } from './folder-icon.type';

/** `PATCH /api/folders/:id` body. Moving into itself or a descendant is rejected with 400. */
export interface UpdateFolderRequest {
  /** 1 to `FOLDER_LIMIT.NameMax` characters. */
  name?: string;
  /** UUID of one of the user's folders; `null` moves the folder to the top level. */
  parentId?: string | null;
  /** One of `FOLDER_COLOUR`. */
  colour?: FolderColour;
  /** One of `FOLDER_ICON`. */
  icon?: FolderIcon;
}
