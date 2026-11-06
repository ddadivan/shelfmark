import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { OverlayLayer } from './overlay-layer.type';
import type { OverlayPoint } from './overlay-point.type';

export interface ConnectedOverlayConfig {
  /**
   * The element the panel is anchored to (the inner native element of a `ui-button`), or a
   * viewport point (context menu at the pointer).
   */
  readonly origin: HTMLElement | OverlayPoint;
  /** Preferred position first, fallbacks after it (the flip). */
  readonly positions: readonly ConnectedPosition[];
  readonly layer: OverlayLayer;
  /** Extra classes for the pane. */
  readonly panelClass?: string | readonly string[];
}
