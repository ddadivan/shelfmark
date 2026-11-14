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
  /**
   * Short description (#418): trimmed before it is checked, at most `FOLDER_LIMIT.DescriptionMax`
   * characters, no control characters (`isFolderDescription`); blank or `null` removes it.
   */
  description?: string | null;
  /**
   * The cover (#418): the UUID of one of your live links directly in this folder (else 404,
   * `FOLDER_ERROR_MESSAGE.CoverNotFound`), or `null` for none.
   */
  coverLinkId?: string | null;
}
