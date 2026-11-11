/**
 * A touch never starts a reorder drag (CDK ends a touch sequence that moves before this delay):
 * on touch the finger scrolls the list and a long press opens the folder menu. Reorder on touch
 * goes through the menu-free keyboard route or a mouse.
 */
export const TREE_REORDER_TOUCH_DELAY_MS = 24 * 60 * 60 * 1000;
