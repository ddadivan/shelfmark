import { ComponentPortal } from '@angular/cdk/portal';
import { Component, inject, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ConnectedOverlay } from './connected-overlay';
import type { OverlaySide } from './models/overlay-side.type';
import { connectedSide, overlayTransformOrigin, setOverlayOrigin } from './overlay-origin';
import { UiOverlay } from './overlay.service';
import { sidePositions } from './side-positions';

@Component({ template: '<span class="probe">Panel</span>' })
class ProbeComponent {}

const SIDES: readonly OverlaySide[] = ['top', 'bottom', 'left', 'right'];

describe('overlay positions and origin', () => {
  it.each([
    ['top', '50% 100%'],
    ['bottom', '50% 0'],
    ['left', '100% 50%'],
    ['right', '0 50%'],
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
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    for (const side of SIDES) {
      const [preferred, flipped] = sidePositions(side);
      expect(connectedSide(preferred)).toBe(side);
      expect(connectedSide(flipped)).toBe(opposite[side]);
    }
  });

  it('writes --ui-origin on the pane through the CSSOM', () => {
    const pane = document.createElement('div');
    setOverlayOrigin(pane, sidePositions('bottom')[0]);
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
      { origin, positions: sidePositions(side), layer: 'menu', panelClass: 'extra' },
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
    open('top');
    const pane = overlay.pane;
    expect(pane.classList.contains('ui-overlay-pane')).toBe(true);
    expect(pane.classList.contains('ui-overlay-layer--menu')).toBe(true);
    expect(pane.classList.contains('extra')).toBe(true);
    expect(pane.querySelector('.probe')).not.toBeNull();
    expect(overlay.isAttached).toBe(true);
  });

  it('accepts a list of panel classes', () => {
    const service = TestBed.inject(UiOverlay);
    overlay = service.connect({
      origin,
      positions: sidePositions('top'),
      layer: 'toast',
      panelClass: ['a', 'b'],
    });
    overlay.attach(new ComponentPortal(ProbeComponent));
    expect(overlay.pane.classList.contains('a')).toBe(true);
    expect(overlay.pane.classList.contains('b')).toBe(true);
    expect(overlay.side).toBeUndefined();
  });

  it('reports the resolved side and sets --ui-origin from it', () => {
    const sides: OverlaySide[] = [];
    open('top', (side) => sides.push(side));
    expect(sides.at(-1)).toBe('top');
    expect(overlay.side).toBe('top');
    expect(overlay.pane.style.getPropertyValue('--ui-origin')).toBe('50% 100%');
  });

  it('detaches right away when nothing animates', () => {
    open('top');
    overlay.release();
    TestBed.tick();
    expect(overlay.isAttached).toBe(false);
  });

  it('waits for running leave animations before it detaches', async () => {
    open('top');
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

  it('keeps the overlay when the release is cancelled mid-animation', async () => {
    open('top');
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
    open('top');
    overlay.release();
    overlay.cancelRelease();
    TestBed.tick();
    expect(overlay.isAttached).toBe(true);
  });

  it('removes the pane on dispose, also when called twice', () => {
    open('top');
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
      { origin, positions: sidePositions('top'), layer: 'tooltip' },
      { injector: owner.componentInstance.injector },
    );
    overlay.attach(new ComponentPortal(ProbeComponent));
    expect(panes()).toHaveLength(1);
    owner.destroy();
    expect(panes()).toHaveLength(0);
  });
});
