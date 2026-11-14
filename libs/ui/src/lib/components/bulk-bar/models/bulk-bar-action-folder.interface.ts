import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** A folder tile shown in place of an action's icon (the folder an action moves to). */
export interface BulkBarActionFolder {
  /** Tile colour; graphite when unset. */
  colour?: FolderColour | string;
  /** Tile glyph (an icon name or an emoji); `folder` when unset. */
  icon?: IconName | string;
}
