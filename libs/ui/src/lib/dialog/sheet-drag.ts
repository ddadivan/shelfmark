/** A release past this share of the sheet height closes it. */
export const SHEET_CLOSE_RATIO = 0.3;
/** A downward flick faster than this (px per ms) closes it whatever the distance. */
export const SHEET_FLICK_VELOCITY = 0.5;

/**
 * Decides what a released drag does. `offset` is the distance dragged down (px), `height` the
 * sheet height and `velocity` the downward speed at release (px per ms).
 */
export function shouldCloseSheet(offset: number, height: number, velocity: number): boolean {
  if (offset <= 0) {
    return false;
  }
  return velocity >= SHEET_FLICK_VELOCITY || (height > 0 && offset / height >= SHEET_CLOSE_RATIO);
}
