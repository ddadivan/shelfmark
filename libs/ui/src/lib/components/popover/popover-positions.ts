import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Above the trigger first, lined up with its start edge, then with its end edge (horizontal
 * flip); below it when there is no room above.
 */
export function popoverPositions(): ConnectedPosition[] {
  const start = { originX: 'start', overlayX: 'start' } as const;
  const end = { originX: 'end', overlayX: 'end' } as const;
  return [
    { ...start, originY: 'top', overlayY: 'bottom' },
    { ...end, originY: 'top', overlayY: 'bottom' },
    { ...start, originY: 'bottom', overlayY: 'top' },
    { ...end, originY: 'bottom', overlayY: 'top' },
  ];
}
