import type { COLOR_SCHEME } from '../../src/models/color-scheme.const';

/** The colour scheme a variant is recorded in (the app follows the system preference). */
export type PromoTheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];
