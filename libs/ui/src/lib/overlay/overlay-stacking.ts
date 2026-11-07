import { OVERLAY_LAYER } from './models/overlay-layer.const';
import type { OverlayLayer } from './models/overlay-layer.type';
import { overlayLayerClass } from './overlay-layer';

const LAYERS: readonly OverlayLayer[] = Object.values(OVERLAY_LAYER);

function layerRank(host: Element): number {
  return LAYERS.findIndex((layer) => host.classList.contains(overlayLayerClass(layer)));
}

function isShownPopover(host: Element): boolean {
  try {
    return host.matches(':popover-open');
  } catch {
    return false;
  }
}

function reshow(host: HTMLElement): void {
  try {
    host.hidePopover();
    host.showPopover();
  } catch {
    // Not a popover (no Popover API): `z-index` already orders it.
  }
}

/**
 * CDK overlays are popovers (the top layer): a popover shown later is on top whatever its
 * `z-index`, so the layer order of `styles/_overlay.scss` alone does not hold (a toast created
 * with its service would sit below a drawer opened afterwards). Re-showing a popover moves it
 * to the front. This re-shows, in layer order, every shown overlay host that belongs to a
 * higher layer than `host`, so toasts and tooltips stay above a freshly opened dialog or
 * drawer. With `includeSelf` the host itself is re-shown first (a toast that appears while a
 * dialog is open).
 */
export function raiseOverlayLayers(host: HTMLElement, includeSelf = false): void {
  const rank = layerRank(host);
  const siblings = Array.from(host.parentElement?.children ?? []).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      element !== host &&
      element.hasAttribute('popover') &&
      layerRank(element) > rank &&
      isShownPopover(element),
  );
  siblings.sort((a, b) => layerRank(a) - layerRank(b));
  if (includeSelf) {
    reshow(host);
  }
  siblings.forEach(reshow);
}
