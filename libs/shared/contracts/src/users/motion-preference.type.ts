import type { MOTION_PREFERENCE } from './motion-preference.const';

/** One of `MOTION_PREFERENCE`. */
export type MotionPreference = (typeof MOTION_PREFERENCE)[keyof typeof MOTION_PREFERENCE];
