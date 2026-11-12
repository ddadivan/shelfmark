import type { FLAG_CODE } from './flag-code.const';

/** A flag `ui-flag` can draw. */
export type FlagCode = (typeof FLAG_CODE)[keyof typeof FLAG_CODE];
