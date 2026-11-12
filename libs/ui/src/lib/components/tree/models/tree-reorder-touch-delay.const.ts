/**
 * Touch reorder, like iOS (#315): a finger has to rest this long on a row before moving it starts
 * a drag (CDK `dragStartDelay`). A move before that ends the sequence, so a plain swipe scrolls;
 * a long press without moving still opens the row menu (`LONG_PRESS_DURATION_MS`, 500), which
 * is longer than this delay, so press, wait, move = drag and press, hold = menu.
 */
export const TREE_REORDER_TOUCH_DELAY_MS = 400;
