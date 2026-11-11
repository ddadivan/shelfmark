import type { UiTreeNode } from './tree-node.interface';
import type { UiTreeReorderTrigger } from './tree-reorder-trigger.type';

/**
 * A folder row asks for a new place among its siblings (never another parent): `fromIndex` and
 * `toIndex` count the siblings, `total` is how many there are, `parentId` is `null` at the top level.
 */
export interface UiTreeReorderEvent {
  node: UiTreeNode;
  parentId: string | null;
  fromIndex: number;
  toIndex: number;
  total: number;
  trigger: UiTreeReorderTrigger;
}
