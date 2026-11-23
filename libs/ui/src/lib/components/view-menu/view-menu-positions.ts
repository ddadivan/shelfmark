import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Below the trigger lined up with its end edge (the View button sits at the right of the page
 * header), then lined up with its start edge; above it when there is no room below.
 */
export function viewMenuPositions(): ConnectedPosition[] {
  const start = { originX: 'start', overlayX: 'start' } as const;
  const end = { originX: 'end', overlayX: 'end' } as const;
  return [
    { ...end, originY: 'bottom', overlayY: 'top' },
    { ...start, originY: 'bottom', overlayY: 'top' },
    { ...end, originY: 'top', overlayY: 'bottom' },
    { ...start, originY: 'top', overlayY: 'bottom' },
  ];
}
