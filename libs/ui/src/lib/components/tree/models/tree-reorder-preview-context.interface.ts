import type { UiTreeNode } from './tree-node.interface';

/** Context of the drag preview and drop-slot templates of a reordered row. */
export interface TreeReorderPreviewContext {
  $implicit: UiTreeNode;
  level: number;
}
