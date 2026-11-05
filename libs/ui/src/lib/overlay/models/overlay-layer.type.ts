/**
 * Stacking layer of a pane, low to high: dialog (scrim and panel), menu (menus, listboxes),
 * toast, tooltip. The z-index values live in `styles/_overlay.scss`.
 */
export type OverlayLayer = 'dialog' | 'menu' | 'toast' | 'tooltip';
