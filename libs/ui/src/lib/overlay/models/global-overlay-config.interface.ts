import type { OverlayLayer } from './overlay-layer.type';

export interface GlobalOverlayConfig {
  readonly layer: OverlayLayer;
  /** Which viewport edge the full-width strip sits on. Default `bottom`. */
  readonly edge?: 'top' | 'bottom';
  /** Extra classes for the pane. */
  readonly panelClass?: string | readonly string[];
}
