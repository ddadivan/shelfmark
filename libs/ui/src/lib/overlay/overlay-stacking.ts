import { OVERLAY_LAYER_ORDER } from './models/overlay-layer-order.const';
import { overlayLayerClass } from './overlay-layer';

function layerRank(host: Element): number {
  return OVERLAY_LAYER_ORDER.findIndex((layer) =>
    host.classList.contains(overlayLayerClass(layer)),
  );
}

function isShownPopover(host: Element): boolean {
  try {
    return host.matches(':popover-open');
  } catch {
    return false;
  }
}

/** Focus inside would be lost by hide/show; a leaving pane would flash back for a frame. */
function mustStay(host: HTMLElement): boolean {
  const active = host.ownerDocument.activeElement;
  return (
    (active !== null && host.contains(active)) || host.querySelector('[class*="--leave"]') !== null
  );
}

function reshow(host: HTMLElement): void {
  if (mustStay(host)) {
    return;
  }
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
 * drawer. A host that holds focus or a pane that is leaving (`*--leave` class) is left where it
 * is (re-showing would drop focus or flash the pane). Accepted: re-showing a visible toast
 * restarts its enter animation, once, when a modal opens over it. With `includeSelf` the host itself is re-shown first (a toast that appears while a
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
