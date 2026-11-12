/**
 * How an icon button reaches the 44px touch target on `pointer: coarse`: `grow` makes the
 * button itself 44px, `overlay` keeps the visual size and adds an invisible hit area.
 */
export const BUTTON_HIT_AREA = {
  Grow: 'grow',
  Overlay: 'overlay',
} as const;
