import type { IconName } from '../../icon/models/icon-name.type';
import type { FolderColour } from '../../folder-icon/models/folder-colour.type';

/** The folder tile that leads a `moved` toast (a `ui-folder-icon`). */
export interface ToastFolder {
  /** The folder's colour; graphite until the person picks one. */
  readonly colour?: FolderColour;
  /** Glyph of the tile; the folder glyph by default. */
  readonly icon?: IconName;
}
