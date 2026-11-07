import { afterEach, describe, expect, it, vi } from 'vitest';
import { OVERLAY_LAYER } from './models/overlay-layer.const';
import type { OverlayLayer } from './models/overlay-layer.type';
import { overlayLayerClass } from './overlay-layer';
import { raiseOverlayLayers } from './overlay-stacking';

interface Popover extends HTMLElement {
  showPopover(): void;
  hidePopover(): void;
}

const container = document.createElement('div');
document.body.appendChild(container);

function host(layer: OverlayLayer, open = true): Popover {
  const element = document.createElement('div') as Popover;
  element.setAttribute('popover', 'manual');
  element.classList.add(overlayLayerClass(layer));
  vi.spyOn(element, 'matches').mockReturnValue(open);
  container.appendChild(element);
  return element;
}

describe('raiseOverlayLayers', () => {
  afterEach(() => {
    container.replaceChildren();
  });

  it('re-shows only the shown hosts of higher layers, lowest first', () => {
    const order: string[] = [];
    const track = (name: string, element: Popover): void => {
      element.hidePopover = vi.fn(() => order.push(`hide ${name}`));
      element.showPopover = vi.fn(() => order.push(`show ${name}`));
    };
    const tooltip = host(OVERLAY_LAYER.Tooltip);
    const toast = host(OVERLAY_LAYER.Toast);
    const menu = host(OVERLAY_LAYER.Menu);
    const closed = host(OVERLAY_LAYER.Toast, false);
    const lower = host(OVERLAY_LAYER.Dialog);
    const dialog = host(OVERLAY_LAYER.Dialog);
    track('tooltip', tooltip);
    track('toast', toast);
    track('menu', menu);
    track('closed', closed);
    track('lower', lower);
    track('dialog', dialog);

    raiseOverlayLayers(dialog);

    expect(order).toEqual([
      'hide menu',
      'show menu',
      'hide toast',
      'show toast',
      'hide tooltip',
      'show tooltip',
    ]);
  });

  it('re-shows the host itself first with includeSelf', () => {
    const order: string[] = [];
    const toast = host(OVERLAY_LAYER.Toast);
    const tooltip = host(OVERLAY_LAYER.Tooltip);
    toast.hidePopover = vi.fn(() => order.push('hide toast'));
    toast.showPopover = vi.fn(() => order.push('show toast'));
    tooltip.hidePopover = vi.fn(() => order.push('hide tooltip'));
    tooltip.showPopover = vi.fn(() => order.push('show tooltip'));

    raiseOverlayLayers(toast, true);

    expect(order).toEqual(['hide toast', 'show toast', 'hide tooltip', 'show tooltip']);
  });

  it('does nothing without the Popover API', () => {
    const toast = host(OVERLAY_LAYER.Toast);
    const dialog = host(OVERLAY_LAYER.Dialog);
    vi.spyOn(toast, 'matches').mockImplementation(() => {
      throw new Error('unsupported selector');
    });
    expect(() => raiseOverlayLayers(dialog)).not.toThrow();
    // No hidePopover on the element: the call is swallowed.
    expect(() => raiseOverlayLayers(toast, true)).not.toThrow();
  });
});
