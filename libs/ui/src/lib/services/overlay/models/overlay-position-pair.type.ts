import type { ConnectionPositionPair } from '@angular/cdk/overlay';

/** The part of a resolved connected position the helpers read. */
export type OverlayPositionPair = Pick<
  ConnectionPositionPair,
  'originX' | 'originY' | 'overlayX' | 'overlayY'
>;
