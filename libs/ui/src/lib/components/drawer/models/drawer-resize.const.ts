/**
 * Resizing a `ui-drawer` (#521): the default limits in px (today's 440px wide panel up to 880px,
 * never more than `MaxViewportShare` of the window), the keyboard step, and the media query from
 * which a drawer can be resized (below it phones and tablets keep the full-screen panel).
 */
export const DRAWER_RESIZE = {
  MinWidth: 440,
  MaxWidth: 880,
  MaxViewportShare: 0.7,
  Step: 40,
  MediaQuery: '(width >= 64em)',
} as const;
