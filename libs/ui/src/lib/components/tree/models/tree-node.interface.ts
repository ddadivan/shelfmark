import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One row of `ui-tree`: a fixed entry (All links, Favorites) or a folder with children. */
export interface UiTreeNode {
  /** Stable, unique id across the whole tree; it is the value `activeId` matches. */
  readonly id: string;
  /** Visible name; a long one is cut with an ellipsis. */
  readonly name: string;
  /** Icon before the name. Fixed rows show none; folder rows draw it in a `ui-folder-icon` tile (default `folder`; an icon name or one emoji). */
  readonly icon?: IconName | string;
  /** Colour of the folder tile; graphite when unset. Fixed rows ignore it. */
  readonly colour?: FolderColour | string;
  /**
   * Draws the folder row with a soft background in its colour (#440), stronger when it is the
   * open row and with no grey hover. Needs a `colour` other than graphite; fixed rows ignore it.
   */
  readonly highlighted?: boolean;
  /**
   * Short text about a folder (#418): a tooltip on the name and the row's `aria-description`
   * (through `uiTooltip`). Fixed rows ignore it.
   */
  readonly description?: string;
  /** Number shown on the right. */
  readonly count?: number;
  /**
   * Short text on the right in the accent tone instead of the count ("5 forgotten"): something
   * waits behind the row. It is read with the name like a count. Only for fixed rows.
   */
  readonly note?: string;
  /**
   * A small accent dot after the name: something new waits behind the row ("What's new" until it
   * is opened). The string is its accessible name ("new"), read with the row's name.
   */
  readonly dot?: string;
  /** Starts expanded (folders with children only). Later changes by the user are kept. */
  readonly expanded?: boolean;
  readonly children?: readonly UiTreeNode[];
}
