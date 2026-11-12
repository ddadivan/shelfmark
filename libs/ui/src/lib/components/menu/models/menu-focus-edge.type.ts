import type { MENU_FOCUS_EDGE } from './menu-focus-edge.const';

/** The item that gets focus when a menu opens. */
export type MenuFocusEdge = (typeof MENU_FOCUS_EDGE)[keyof typeof MENU_FOCUS_EDGE];
