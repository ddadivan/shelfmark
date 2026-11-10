/** Distance in CSS pixels from a card's centre at which the lean reaches its maximum. */
export const TILT_REACH_PX = 600;

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

/**
 * Which side of a card the pointer is on, each axis from -1 (left / above) to 1 (right / below),
 * 0 at the card's centre. The card leans toward the pointer by this much.
 */
export function tiltVector(
  pointer: { readonly x: number; readonly y: number },
  rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
): { readonly x: number; readonly y: number } {
  return {
    x: clamp((pointer.x - (rect.left + rect.width / 2)) / TILT_REACH_PX),
    y: clamp((pointer.y - (rect.top + rect.height / 2)) / TILT_REACH_PX),
  };
}
