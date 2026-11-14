import type { MENU_ALIGN } from './menu-align.const';

/** Which edge of the trigger the menu lines up with: its left edge (`start`) or right edge (`end`). */
export type MenuAlign = (typeof MENU_ALIGN)[keyof typeof MENU_ALIGN];
