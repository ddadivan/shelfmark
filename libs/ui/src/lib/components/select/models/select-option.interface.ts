import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One choice of `ui-select`; `children` nest it (a folder inside a folder). */
export interface SelectOption {
  /** Value written to the form when the option is chosen. */
  readonly id: string;
  /** Visible name. */
  readonly name: string;
  /** Language of `name` when it differs from the page (a language list: `Deutsch` is `de`). */
  readonly lang?: string;
  /**
   * A folder's tile colour (a `FolderColour` or an own `#rrggbb`, #418); with `icon` the row and
   * the trigger draw the folder tile instead of the plain folder glyph.
   */
  readonly colour?: FolderColour | string;
  /** A folder's glyph or emoji for its tile (#418). */
  readonly icon?: IconName | string;
  readonly children?: readonly SelectOption[];
}
