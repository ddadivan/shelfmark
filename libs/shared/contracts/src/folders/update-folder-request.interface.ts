import type { FolderColour } from './folder-colour.type';
import type { HexColour } from '../users/hex-colour.type';
import type { FolderEmoji } from './folder-emoji.type';
import type { FolderIcon } from './folder-icon.type';

/** `PATCH /api/folders/:id` body. Moving into itself or a descendant is rejected with 400. */
export interface UpdateFolderRequest {
  /** 1 to `FOLDER_LIMIT.NameMax` characters. */
  name?: string;
  /** UUID of one of the user's folders; `null` moves the folder to the top level. */
  parentId?: string | null;
  /** One of `FOLDER_COLOUR` or an own colour as lower-case `#rrggbb`. */
  colour?: FolderColour | HexColour;
  /** One of `FOLDER_ICON` or exactly one emoji (`isFolderEmoji`; at most `FOLDER_EMOJI_MAX_CODE_POINTS` code points). */
  icon?: FolderIcon | FolderEmoji;
}
