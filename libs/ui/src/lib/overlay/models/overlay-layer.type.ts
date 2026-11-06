import type { OVERLAY_LAYER } from './overlay-layer.const';

/**
 * Stacking layer of a pane, low to high: dialog (scrim and panel), menu (menus, listboxes),
 * toast, tooltip. The z-index values live in `styles/_overlay.scss`.
 */
export type OverlayLayer = (typeof OVERLAY_LAYER)[keyof typeof OVERLAY_LAYER];
