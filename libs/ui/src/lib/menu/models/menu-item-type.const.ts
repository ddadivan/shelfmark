/**
 * Kind of a menu item: an action (`item`), a toggle (`checkbox`) or one choice of a group such
 * as the theme (`radio`). It maps to the ARIA role of the inner element.
 */
export const MENU_ITEM_TYPE = {
  Item: 'item',
  Checkbox: 'checkbox',
  Radio: 'radio',
} as const;
