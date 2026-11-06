/**
 * Stacking layer of a pane, low to high: dialog (scrim and panel), menu (menus, listboxes),
 * toast, tooltip. The z-index values live in `styles/_overlay.scss`.
 */
export const OVERLAY_LAYER = {
  Dialog: 'dialog',
  Menu: 'menu',
  Toast: 'toast',
  Tooltip: 'tooltip',
} as const;
