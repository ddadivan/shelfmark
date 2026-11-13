import type { DragSample } from './models/drag-sample.interface';
import { SHEET_CLOSE_RATIO } from './models/sheet-close-ratio.const';
import { SHEET_FLICK_VELOCITY } from './models/sheet-flick-velocity.const';
import { SHEET_STALE_MS } from './models/sheet-stale-ms.const';

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

/**
 * Downward speed (px per ms) over the kept samples (oldest to newest). A fast move followed by
 * a pause is not a flick: when the release comes `SHEET_STALE_MS` or more after the last move,
 * the speed is 0.
 */
export function sheetVelocity(samples: readonly DragSample[], releaseTime: number): number {
  const last = samples[samples.length - 1];
  const first = samples[0];
  if (!last || !first || releaseTime - last.time >= SHEET_STALE_MS) {
    return 0;
  }
  const elapsed = last.time - first.time;
  return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}
