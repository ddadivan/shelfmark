import type { SELECT_APPEARANCE } from './select-appearance.const';

/** One of `SELECT_APPEARANCE`. */
export type SelectAppearance = (typeof SELECT_APPEARANCE)[keyof typeof SELECT_APPEARANCE];
