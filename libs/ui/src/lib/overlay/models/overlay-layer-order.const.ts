import { OVERLAY_LAYER } from './overlay-layer.const';
import type { OverlayLayer } from './overlay-layer.type';

/** Layers from lowest to highest; the stacking helpers rank by position here, not by key order. */
export const OVERLAY_LAYER_ORDER: readonly OverlayLayer[] = [
  OVERLAY_LAYER.Dialog,
  OVERLAY_LAYER.Menu,
  OVERLAY_LAYER.Toast,
  OVERLAY_LAYER.Tooltip,
];
