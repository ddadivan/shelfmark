import type { UI_TREE_CONTEXT_MENU_TRIGGER } from './tree-context-menu-trigger.const';

/** What asked for the folder menu: `pointer` (right click), `button` or `keyboard`. */
export type UiTreeContextMenuTrigger =
  (typeof UI_TREE_CONTEXT_MENU_TRIGGER)[keyof typeof UI_TREE_CONTEXT_MENU_TRIGGER];
