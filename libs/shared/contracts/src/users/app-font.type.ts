import type { APP_FONT } from './app-font.const';

/** One of `APP_FONT`. */
export type AppFont = (typeof APP_FONT)[keyof typeof APP_FONT];
