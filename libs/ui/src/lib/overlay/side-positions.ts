import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { OverlaySide } from './models/overlay-side.type';

const OPPOSITE: Record<OverlaySide, OverlaySide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function position(side: OverlaySide): ConnectedPosition {
  switch (side) {
    case 'top':
      return { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' };
    case 'bottom':
      return { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' };
    case 'left':
      return { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' };
    case 'right':
      return { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' };
  }
}

/**
 * Centred positions for a panel on one side of its trigger: the preferred side, then the
 * opposite one when there is no room (flip). The gap between trigger and panel is a margin of
 * the panel itself (rem), not a CDK pixel offset.
 */
export function sidePositions(side: OverlaySide): ConnectedPosition[] {
  return [position(side), position(OPPOSITE[side])];
}
