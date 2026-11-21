import { KEYBOARD_KEY } from '../../models/keyboard';
import type { ResizeHandleLimits } from './models/resize-handle-limits.interface';
import { RESIZE_HANDLE_STEP } from './models/resize-handle-step.const';

/** `value` kept between `min` and `max` (a `max` under `min` counts as `min`), whole px. */
export function clampResizeValue(value: number, min: number, max: number): number {
  const upper = Math.max(min, max);
  return Math.round(Math.min(Math.max(value, min), upper));
}

/** The value while dragging: the start value moved by the pointer travel, clamped. */
export function dragResizeValue(
  startValue: number,
  startX: number,
  x: number,
  limits: ResizeHandleLimits,
): number {
  const travel = limits.rtl ? startX - x : x - startX;
  return clampResizeValue(startValue + travel, limits.min, limits.max);
}

/**
 * The value after a key on the handle, or `null` for any other key. The arrows move the handle
 * on screen (towards the end of the line makes the pane before it wider in ltr, narrower in rtl),
 * by `RESIZE_HANDLE_STEP.Default` px, or `Large` with Shift; Home and End jump to the limits.
 */
export function keyResizeValue(
  key: string,
  value: number,
  shift: boolean,
  limits: ResizeHandleLimits,
): number | null {
  const step = shift ? RESIZE_HANDLE_STEP.Large : RESIZE_HANDLE_STEP.Default;
  const grow = limits.rtl ? -1 : 1;
  switch (key) {
    case KEYBOARD_KEY.Home:
      return clampResizeValue(limits.min, limits.min, limits.max);
    case KEYBOARD_KEY.End:
      return clampResizeValue(limits.max, limits.min, limits.max);
    case KEYBOARD_KEY.ArrowRight:
      return clampResizeValue(value + grow * step, limits.min, limits.max);
    case KEYBOARD_KEY.ArrowLeft:
      return clampResizeValue(value - grow * step, limits.min, limits.max);
    default:
      return null;
  }
}
