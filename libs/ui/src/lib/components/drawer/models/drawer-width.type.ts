import type { DRAWER_WIDTH } from './drawer-width.const';

/** One of `DRAWER_WIDTH`. */
export type DrawerWidth = (typeof DRAWER_WIDTH)[keyof typeof DRAWER_WIDTH];
