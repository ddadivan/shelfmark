import { Overlay } from '@angular/cdk/overlay';
import { inject, Injector, Service } from '@angular/core';
import { ConnectedOverlay } from './connected-overlay';
import type { ConnectedOverlayConfig } from './models/connected-overlay-config.interface';
import type { OverlaySide } from './models/overlay-side.type';

/**
 * Shared entry point for every floating panel (tooltip now; menu, listbox, toast and dialog
 * build on the same pieces). `connect()` anchors a panel to an element with the Shelfmark
 * defaults: flexible position with flip, on-screen push, reposition on scroll, no backdrop,
 * pane classes for the stacking layer, `--ui-origin` from the resolved position.
 * The CDK overlay CSS ships in `global.scss`.
 */
@Service()
export class UiOverlay {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
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
      `ui-overlay-layer--${config.layer}`,
      ...(typeof config.panelClass === 'string' ? [config.panelClass] : (config.panelClass ?? [])),
    ];
    const overlayRef = this.overlay.create({
      positionStrategy: strategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass,
      hasBackdrop: false,
    });
    return new ConnectedOverlay(
      overlayRef,
      strategy,
      options.injector ?? this.injector,
      options.onPositionChange,
    );
  }
}
