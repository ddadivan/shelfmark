import type { IconName } from '../../icon/models/icon-name.type';

/** One row of `ui-tree`: a fixed entry (All links, Favorites) or a folder with children. */
export interface UiTreeNode {
  /** Stable, unique id across the whole tree; it is the value `activeId` matches. */
  readonly id: string;
  /** Visible name; a long one is cut with an ellipsis. */
  readonly name: string;
  /** Icon before the name. Folder rows default to `folder`; fixed rows show none. */
  readonly icon?: IconName;
  /** Number shown on the right. */
  readonly count?: number;
  /** Starts expanded (folders with children only). Later changes by the user are kept. */
  readonly expanded?: boolean;
  readonly children?: readonly UiTreeNode[];
}
