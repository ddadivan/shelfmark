import type { OverlayLayer } from './models/overlay-layer.type';

/** The class that puts a CDK host element on a stacking layer (`styles/_overlay.scss`). */
export function overlayLayerClass(layer: OverlayLayer): string {
  return `ui-overlay-layer--${layer}`;
}

/**
 * Puts the CDK host element (`overlayRef.hostElement`, the stacking context) on a layer.
 * The class must go on the host, not on the pane: a pane class would not reorder overlays that
 * were created earlier.
 */
export function setOverlayLayer(host: HTMLElement, layer: OverlayLayer): void {
  host.classList.add(overlayLayerClass(layer));
}
