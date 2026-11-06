import type { MENU_ITEM_TYPE } from './menu-item-type.const';

/**
 * Kind of a menu item: an action (`item`), a toggle (`checkbox`) or one choice of a group such
 * as the theme (`radio`). It maps to the ARIA role of the inner element.
 */
export type MenuItemType = (typeof MENU_ITEM_TYPE)[keyof typeof MENU_ITEM_TYPE];
