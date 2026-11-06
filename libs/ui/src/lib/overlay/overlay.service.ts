import { Overlay } from '@angular/cdk/overlay';
import { inject, Injector, Service } from '@angular/core';
import { ConnectedOverlay } from './connected-overlay';
import type { GlobalOverlayConfig } from './models/global-overlay-config.interface';
import type { ConnectedOverlayConfig } from './models/connected-overlay-config.interface';
import type { OverlaySide } from './models/overlay-side.type';

/**
 * Shared entry point for every floating panel (tooltip now; menu, listbox, toast and dialog
 * build on the same pieces). `connect()` anchors a panel to an element with the Shelfmark
 * defaults: flexible position with flip, on-screen push, reposition on scroll, no backdrop,
 * a layer class on the host element, `--ui-origin` from the resolved position.
 * The CDK overlay CSS ships in `global.scss`.
 */
@Service()
export class UiOverlay {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
   * The layer class `ui-overlay-layer--<layer>` is on `hostElement`.
   * `injector` should be the owner's (a directive's own), so the overlay is disposed with it;
   * `onPositionChange` reports the side after every (re)position, flip included.
   */
  connect(
    config: ConnectedOverlayConfig,
    options: { injector?: Injector; onPositionChange?: (side: OverlaySide) => void } = {},
  ): ConnectedOverlay {
    const strategy = this.overlay
      .position()
      .flexibleConnectedTo(config.origin)
      .withPositions([...config.positions])
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8);
    const panelClass = [
      'ui-overlay-pane',
      ...(typeof config.panelClass === 'string' ? [config.panelClass] : (config.panelClass ?? [])),
    ];
    const overlayRef = this.overlay.create({
      positionStrategy: strategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass,
      hasBackdrop: false,
    });
    // The layer class goes on the host (the CDK bounding box): that element is the stacking
    // context, so a class on the pane would not reorder overlays that were created earlier.
    overlayRef.hostElement.classList.add(`ui-overlay-layer--${config.layer}`);
    return new ConnectedOverlay(
      overlayRef,
      strategy,
      options.injector ?? this.injector,
      options.onPositionChange,
    );
  }

  /**
   * A panel that is not anchored to an element: it spans the bottom (or top) edge of the
   * viewport and the content decides where inside that strip it sits (toasts). The pane lets
   * pointer events through (`ui-overlay-pane--passthrough`), so the strip never blocks the page.
   * The layer class is on the host element, as with `connect()`.
   */
  global(config: GlobalOverlayConfig, options: { injector?: Injector } = {}): ConnectedOverlay {
    const strategy = this.overlay.position().global().left('0');
    if (config.edge === 'top') {
      strategy.top('0');
    } else {
      strategy.bottom('0');
    }
    const overlayRef = this.overlay.create({
      positionStrategy: strategy,
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      panelClass: [
        'ui-overlay-pane',
        'ui-overlay-pane--passthrough',
        ...(typeof config.panelClass === 'string'
          ? [config.panelClass]
          : (config.panelClass ?? [])),
      ],
      width: '100%',
      hasBackdrop: false,
    });
    overlayRef.hostElement.classList.add(`ui-overlay-layer--${config.layer}`);
    return new ConnectedOverlay(overlayRef, undefined, options.injector ?? this.injector);
  }
}
