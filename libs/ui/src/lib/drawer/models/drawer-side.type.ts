import type { DRAWER_SIDE } from './drawer-side.const';

export type DrawerSide = (typeof DRAWER_SIDE)[keyof typeof DRAWER_SIDE];
