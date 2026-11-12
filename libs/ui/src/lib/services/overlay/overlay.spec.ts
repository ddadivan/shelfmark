import { ComponentPortal } from '@angular/cdk/portal';
import { Component, inject, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compileString } from 'sass';
import type { ConnectedOverlay } from './connected-overlay';
import type { OverlaySide } from './models/overlay-side.type';
import { connectedSide, overlayTransformOrigin, setOverlayOrigin } from './overlay-origin';
import { UiOverlay } from './overlay.service';
import { sidePositions } from './side-positions';
import { OVERLAY_SIDE } from './models/overlay-side.const';
import { OVERLAY_LAYER } from './models/overlay-layer.const';
import { overlayLayerClass } from './overlay-layer';

@Component({ template: '<span class="probe">Panel</span>' })
class ProbeComponent {}

/** The styles folder: walk up from the cwd (Nx runs the target from the workspace root). */
function stylesDir(): string {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = resolve(dir, 'libs/ui/src/styles');
    if (existsSync(resolve(candidate, '_ui.scss'))) {
      return candidate;
    }
    if (dirname(dir) === dir) {
      throw new Error('Cannot find libs/ui/src/styles');
    }
  }
}

const SIDES: readonly OverlaySide[] = Object.values(OVERLAY_SIDE);

describe('overlay positions and origin', () => {
  it.each([
    [OVERLAY_SIDE.Top, '50% 100%'],
    [OVERLAY_SIDE.Bottom, '50% 0'],
    [OVERLAY_SIDE.Left, '100% 50%'],
    [OVERLAY_SIDE.Right, '0 50%'],
  ] as const)('the %s panel grows from %s', (side, origin) => {
    expect(overlayTransformOrigin(sidePositions(side)[0])).toBe(origin);
  });

  it('maps every corner, for panels that hang from a corner of their trigger', () => {
    expect(overlayTransformOrigin({ overlayX: 'end', overlayY: 'top' })).toBe('100% 0');
    expect(overlayTransformOrigin({ overlayX: 'start', overlayY: 'top' })).toBe('0 0');
    expect(overlayTransformOrigin({ overlayX: 'end', overlayY: 'bottom' })).toBe('100% 100%');
  });

  it('flips to the opposite side as the second position', () => {
    const opposite: Record<OverlaySide, OverlaySide> = {
      top: OVERLAY_SIDE.Bottom,
      bottom: OVERLAY_SIDE.Top,
      left: OVERLAY_SIDE.Right,
      right: OVERLAY_SIDE.Left,
    };
    for (const side of SIDES) {
      const [preferred, flipped] = sidePositions(side);
      expect(connectedSide(preferred)).toBe(side);
      expect(connectedSide(flipped)).toBe(opposite[side]);
    }
  });

  it('writes --ui-origin on the pane through the CSSOM', () => {
    const pane = document.createElement('div');
    setOverlayOrigin(pane, sidePositions(OVERLAY_SIDE.Bottom)[0]);
    expect(pane.style.getPropertyValue('--ui-origin')).toBe('50% 0');
    expect(pane.getAttribute('style')).toContain('--ui-origin');
  });
});

describe('UiOverlay', () => {
  let origin: HTMLElement;
  let overlay: ConnectedOverlay;
  const panes = () => document.querySelectorAll('.cdk-overlay-pane');

  function open(side: OverlaySide, onPositionChange?: (s: OverlaySide) => void) {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect(
      { origin, positions: sidePositions(side), layer: OVERLAY_LAYER.Menu, panelClass: 'extra' },
      { injector: TestBed.inject(Injector), onPositionChange },
    );
    overlay.attach(new ComponentPortal(ProbeComponent));
    TestBed.tick();
    return overlay;
  }

  beforeEach(() => {
    origin = document.createElement('button');
    document.body.append(origin);
  });

  afterEach(() => {
    overlay.dispose();
    origin.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
    vi.restoreAllMocks();
  });

  it('creates a pane with the layer and extra classes and attaches the content', () => {
    open(OVERLAY_SIDE.Top);
    const pane = overlay.pane;
    expect(pane.classList.contains('ui-overlay-pane')).toBe(true);
    expect(pane.classList.contains(overlayLayerClass(OVERLAY_LAYER.Menu))).toBe(false);
    expect(overlay.host.classList.contains(overlayLayerClass(OVERLAY_LAYER.Menu))).toBe(true);
    expect(pane.classList.contains('extra')).toBe(true);
    expect(pane.querySelector('.probe')).not.toBeNull();
    expect(overlay.isAttached).toBe(true);
  });

  it('orders hosts by layer, not by creation: a later menu stays under an earlier tooltip', () => {
    const sheet = document.createElement('style');
    sheet.textContent = compileString(`@use 'ui' as *;\n@include overlay-layers;`, {
      loadPaths: [stylesDir()],
    }).css;
    document.head.append(sheet);
    const service = TestBed.inject(UiOverlay);
    const tooltip = service.connect({
      origin,
      positions: sidePositions(OVERLAY_SIDE.Top),
      layer: OVERLAY_LAYER.Tooltip,
    });
    tooltip.attach(new ComponentPortal(ProbeComponent));
    overlay = service.connect({
      origin,
      positions: sidePositions(OVERLAY_SIDE.Top),
      layer: OVERLAY_LAYER.Menu,
    });
    overlay.attach(new ComponentPortal(ProbeComponent));
    const z = (el: HTMLElement) => Number(getComputedStyle(el).zIndex);
    expect(tooltip.host.classList.contains(overlayLayerClass(OVERLAY_LAYER.Tooltip))).toBe(true);
    expect(z(tooltip.host)).toBeGreaterThan(z(overlay.host));
    tooltip.dispose();
    sheet.remove();
  });

  it('accepts a list of panel classes', () => {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect({
      origin,
      positions: sidePositions(OVERLAY_SIDE.Top),
      layer: OVERLAY_LAYER.Toast,
      panelClass: ['a', 'b'],
    });
    overlay.attach(new ComponentPortal(ProbeComponent));
    expect(overlay.pane.classList.contains('a')).toBe(true);
    expect(overlay.pane.classList.contains('b')).toBe(true);
    expect(overlay.side).toBeUndefined();
  });

  it('reports the resolved side and sets --ui-origin from it', () => {
    const sides: OverlaySide[] = [];
    open(OVERLAY_SIDE.Top, (side) => sides.push(side));
    expect(sides.at(-1)).toBe(OVERLAY_SIDE.Top);
    expect(overlay.side).toBe(OVERLAY_SIDE.Top);
    expect(overlay.pane.style.getPropertyValue('--ui-origin')).toBe('50% 100%');
  });

  it('detaches right away when nothing animates', () => {
    open(OVERLAY_SIDE.Top);
    overlay.release();
    TestBed.tick();
    expect(overlay.isAttached).toBe(false);
  });

  it('waits for running leave animations before it detaches', async () => {
    open(OVERLAY_SIDE.Top);
    let finish: () => void = () => undefined;
    const finished = new Promise<Animation>((resolve) => {
      finish = () => {
        resolve({} as Animation);
      };
    });
    overlay.pane.getAnimations = () => [{ finished } as Animation];
    overlay.release();
    TestBed.tick();
    expect(overlay.isAttached).toBe(true);
    finish();
    await finished;
    await Promise.resolve();
    await Promise.resolve();
    expect(overlay.isAttached).toBe(false);
  });

  it('detaches after the timeout when an animation never finishes', async () => {
    vi.useFakeTimers();
    open(OVERLAY_SIDE.Top);
    overlay.pane.getAnimations = () => [
      { finished: new Promise<Animation>(() => undefined) } as Animation,
    ];
    overlay.release();
    TestBed.tick();
    expect(overlay.isAttached).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(overlay.isAttached).toBe(false);
    vi.useRealTimers();
  });

  it('clears the fallback timer when the release is cancelled', () => {
    vi.useFakeTimers();
    open(OVERLAY_SIDE.Top);
    overlay.pane.getAnimations = () => [
      { finished: new Promise<Animation>(() => undefined) } as Animation,
    ];
    overlay.release();
    TestBed.tick();
    // A change notification makes Angular race a zero-delay timeout against requestAnimationFrame
    // (jsdom 31 has rAF by default); run it so only the overlay's own fallback timer is left.
    vi.advanceTimersByTime(0);
    expect(vi.getTimerCount()).toBe(1);
    overlay.cancelRelease();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('keeps the overlay when the release is cancelled mid-animation', async () => {
    open(OVERLAY_SIDE.Top);
    let finish: () => void = () => undefined;
    const finished = new Promise<Animation>((resolve) => {
      finish = () => {
        resolve({} as Animation);
      };
    });
    overlay.pane.getAnimations = () => [{ finished } as Animation];
    overlay.release();
    TestBed.tick();
    overlay.cancelRelease();
    finish();
    await finished;
    await Promise.resolve();
    await Promise.resolve();
    expect(overlay.isAttached).toBe(true);
  });

  it('a release that was superseded before the next render does nothing', () => {
    open(OVERLAY_SIDE.Top);
    overlay.release();
    overlay.cancelRelease();
    TestBed.tick();
    expect(overlay.isAttached).toBe(true);
  });

  it('removes the pane on dispose, also when called twice', () => {
    open(OVERLAY_SIDE.Top);
    expect(panes()).toHaveLength(1);
    overlay.updatePosition();
    overlay.dispose();
    overlay.dispose();
    expect(panes()).toHaveLength(0);
  });

  it('is disposed with its owner injector', () => {
    @Component({ template: '' })
    class OwnerComponent {
      readonly injector = inject(Injector);
    }
    const owner = TestBed.createComponent(OwnerComponent);
    overlay = TestBed.inject(UiOverlay).connect(
      { origin, positions: sidePositions(OVERLAY_SIDE.Top), layer: OVERLAY_LAYER.Tooltip },
      { injector: owner.componentInstance.injector },
    );
    overlay.attach(new ComponentPortal(ProbeComponent));
    expect(panes()).toHaveLength(1);
    owner.destroy();
    expect(panes()).toHaveLength(0);
  });
  it('moves an existing element into the pane and puts it back on detach', () => {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect({
      origin,
      positions: sidePositions(OVERLAY_SIDE.Bottom),
      layer: OVERLAY_LAYER.Menu,
    });
    const parent = document.createElement('div');
    const element = document.createElement('div');
    parent.append(element);
    document.body.append(parent);
    let detached = 0;
    overlay.detachments().subscribe(() => detached++);
    overlay.attachElement(element);
    expect(overlay.pane.contains(element)).toBe(true);
    overlay.detach();
    expect(parent.contains(element)).toBe(true);
    expect(detached).toBe(1);
    parent.remove();
  });

  it('hides a moved element in the same task it is put back, and shows it again on re-attach', () => {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect({
      origin,
      positions: sidePositions(OVERLAY_SIDE.Bottom),
      layer: OVERLAY_LAYER.Menu,
    });
    const parent = document.createElement('div');
    const element = document.createElement('div');
    parent.append(element);
    document.body.append(parent);
    overlay.attachElement(element);
    expect(element.style.display).toBe('');
    overlay.detach();
    // Back in the page, still carrying the owner's "shown" class: it must not take up room.
    expect(parent.contains(element)).toBe(true);
    expect(element.style.display).toBe('none');
    overlay.attachElement(element);
    expect(element.style.display).toBe('');
    parent.remove();
  });

  it('anchors to a viewport point', () => {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect({
      origin: { x: 40, y: 60 },
      positions: sidePositions(OVERLAY_SIDE.Bottom),
      layer: OVERLAY_LAYER.Menu,
    });
    overlay.attach(new ComponentPortal(ProbeComponent));
    TestBed.tick();
    expect(overlay.isAttached).toBe(true);
  });
});
