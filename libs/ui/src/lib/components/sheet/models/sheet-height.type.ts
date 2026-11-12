import type { SHEET_HEIGHT } from './sheet-height.const';

/** Height of a phone sheet: `auto` or `tall`. */
export type SheetHeight = (typeof SHEET_HEIGHT)[keyof typeof SHEET_HEIGHT];
