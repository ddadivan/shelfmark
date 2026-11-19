import { KEYBOARD_KEY } from '../../models/keyboard';
import { DRAWER_RESIZE } from './models/drawer-resize.const';

/** The largest width now: `max`, at most `MaxViewportShare` of the window, never under `min`. */
export function drawerMaxWidth(min: number, max: number, viewport: number): number {
  return Math.max(min, Math.min(max, Math.floor(viewport * DRAWER_RESIZE.MaxViewportShare)));
}

/** `width` kept between `min` and the current maximum, rounded to whole px. */
export function clampDrawerWidth(width: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(width, min), max));
}

/**
 * The width after a key on the resize handle, or `null` for any other key. The arrows move the
 * handle: towards the content (inline-start for an end drawer in ltr) makes it wider; Home and End
 * jump to the minimum and the maximum.
 */
export function drawerKeyWidth(
  key: string,
  width: number,
  limits: { min: number; max: number; growsTowardsLeft: boolean },
): number | null {
  const { min, max, growsTowardsLeft } = limits;
  switch (key) {
    case KEYBOARD_KEY.Home:
      return min;
    case KEYBOARD_KEY.End:
      return max;
    case KEYBOARD_KEY.ArrowLeft:
      return clampDrawerWidth(width + (growsTowardsLeft ? 1 : -1) * DRAWER_RESIZE.Step, min, max);
    case KEYBOARD_KEY.ArrowRight:
      return clampDrawerWidth(width + (growsTowardsLeft ? -1 : 1) * DRAWER_RESIZE.Step, min, max);
    default:
      return null;
  }
}
