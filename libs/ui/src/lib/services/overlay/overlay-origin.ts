import type { OverlayPositionPair } from './models/overlay-position-pair.type';
import type { OverlaySide } from './models/overlay-side.type';
import { OVERLAY_SIDE } from './models/overlay-side.const';

const ORIGIN_PROPERTY = '--ui-origin';

/**
 * `transform-origin` for a panel from the point where it is attached to its trigger:
 * the panel grows out of that point (`100% 0` for a panel whose top-right corner touches the
 * trigger, `50% 100%` for a tooltip above its trigger).
 */
export function overlayTransformOrigin(pair: Pick<OverlayPositionPair, 'overlayX' | 'overlayY'>) {
  const x = { start: '0', center: '50%', end: '100%' }[pair.overlayX];
  const y = { top: '0', center: '50%', bottom: '100%' }[pair.overlayY];
  return `${x} ${y}`;
}

/** Sets `--ui-origin` on the pane (CSSOM write, no `style` attribute in the markup). */
export function setOverlayOrigin(pane: HTMLElement, pair: OverlayPositionPair): void {
  pane.style.setProperty(ORIGIN_PROPERTY, overlayTransformOrigin(pair));
}

/** The side of the trigger a resolved position puts the panel on. */
export function connectedSide(pair: OverlayPositionPair): OverlaySide {
  if (pair.overlayY === 'bottom' && pair.originY === 'top') {
    return OVERLAY_SIDE.Top;
  }
  if (pair.overlayY === 'top' && pair.originY === 'bottom') {
    return OVERLAY_SIDE.Bottom;
  }
  return pair.overlayX === 'end' && pair.originX === 'start'
    ? OVERLAY_SIDE.Left
    : OVERLAY_SIDE.Right;
}
