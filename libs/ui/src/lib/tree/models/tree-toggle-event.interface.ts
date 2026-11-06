import type { UiTreeNode } from './tree-node.interface';

/** A folder opened or closed, by keyboard, click or the chevron. */
export interface UiTreeToggleEvent {
  readonly node: UiTreeNode;
  readonly expanded: boolean;
}
