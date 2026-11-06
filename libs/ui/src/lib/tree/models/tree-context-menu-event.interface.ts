import type { OverlayPoint } from '../../overlay/models/overlay-point.interface';
import type { UiTreeContextMenuTrigger } from './tree-context-menu-trigger.type';
import type { UiTreeNode } from './tree-node.interface';

/**
 * The folder menu was requested. The feature opens its `ui-menu`: `menu.openAt(position)` for a
 * right click, `menu.openFrom(anchor)` otherwise (focus returns to where it was).
 */
export interface UiTreeContextMenuEvent {
  readonly node: UiTreeNode;
  readonly trigger: UiTreeContextMenuTrigger;
  /** The "..." button's native element for `button`, the row for `pointer` and `keyboard`. */
  readonly anchor: HTMLElement;
  /** Pointer position for `pointer`; `null` for `button` and `keyboard`. */
  readonly position: OverlayPoint | null;
}
