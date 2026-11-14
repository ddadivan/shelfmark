import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One choice of `ui-picker-list`; `children` nest it (a folder inside a folder). */
export interface PickerOption {
  /** Value emitted when the option is chosen. */
  readonly id: string;
  /** Visible name. */
  readonly name: string;
  /** Glyph of the coloured tile before the name (default `folder`). */
  readonly icon?: IconName | string;
  /** Colour of the tile; graphite when unset. */
  readonly colour?: FolderColour | string;
  readonly children?: readonly PickerOption[];
}
