import type { UI_TREE_REORDER_TRIGGER } from './tree-reorder-trigger.const';

export type UiTreeReorderTrigger =
  (typeof UI_TREE_REORDER_TRIGGER)[keyof typeof UI_TREE_REORDER_TRIGGER];
