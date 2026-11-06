import type { OVERLAY_EDGE } from './overlay-edge.const';

/** Which viewport edge a full-width global panel sits on. */
export type OverlayEdge = (typeof OVERLAY_EDGE)[keyof typeof OVERLAY_EDGE];
