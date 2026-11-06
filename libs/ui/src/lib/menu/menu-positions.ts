import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { MenuAlign } from './models/menu-align.type';
import { MENU_ALIGN } from './models/menu-align.const';

/**
 * Positions below a trigger, then above it; the second pair of each row is the horizontal flip
 * when the menu would run off the screen.
 */
export function menuPositions(align: MenuAlign): ConnectedPosition[] {
  const start = { originX: 'start', overlayX: 'start' } as const;
  const end = { originX: 'end', overlayX: 'end' } as const;
  const [first, second] = align === MENU_ALIGN.Start ? [start, end] : [end, start];
  return [
    { ...first, originY: 'bottom', overlayY: 'top' },
    { ...second, originY: 'bottom', overlayY: 'top' },
    { ...first, originY: 'top', overlayY: 'bottom' },
    { ...second, originY: 'top', overlayY: 'bottom' },
  ];
}

/**
 * Positions for a menu opened at a point (context menu): the top-left corner at the point,
 * flipped left and/or up when there is no room on the screen.
 */
export function pointPositions(): ConnectedPosition[] {
  return [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
  ];
}
