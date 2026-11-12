import type { OVERLAY_SIDE } from './overlay-side.const';

/** The side of the trigger a connected overlay opens on. */
export type OverlaySide = (typeof OVERLAY_SIDE)[keyof typeof OVERLAY_SIDE];
