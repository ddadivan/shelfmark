import { afterNextRender, DestroyRef, inject, Injector, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { MENU_ALIGN } from '../../components/menu/models/menu-align.const';
import { menuPositions } from '../../components/menu/menu-positions';
import type { ConnectedOverlay } from './connected-overlay';
import type { FieldPopupOptions } from './models/field-popup-options.interface';
import { OVERLAY_LAYER } from './models/overlay-layer.const';
import { UiOverlay } from './overlay.service';

/**
 * The listbox popup of a field (`ui-select`, `ui-tag-input`, the `popup` mode of
 * `ui-command-list`): a `UiOverlay` pane (layer `menu`) under the origin, at least (or exactly) as
 * wide as it, re-measured on every reposition and while the origin resizes (`ResizeObserver`,
 * measured px on purpose). Reopening during the leave animation keeps the pane; hiding releases it
 * one render later so it sees the running leave animations. Create it in the component's injection
 * context; it is disposed with the component.
 */
export class FieldPopup {
  /** The popup element sits in the overlay pane (shown, or still leaving). */
  readonly attached = signal(false);

  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private readonly options: FieldPopupOptions) {
    inject(DestroyRef).onDestroy(() => {
      this.stopWidthSync();
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      if (this.options.ownsPopup?.() ?? true) {
        this.options.popup().remove();
      }
    });
  }

  /** Attaches the popup to its pane (or keeps the leaving one) and places it. */
  show(): void {
    if (this.overlay?.isAttached) {
      // Reopened while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.createOverlay();
    }
    this.syncWidth();
    this.watchWidth();
    this.attached.set(true);
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
      },
      { injector: this.injector },
    );
  }

  /** The popup content leaves in this render; the pane is released in the next one. */
  hide(): void {
    if (!this.overlay) {
      return;
    }
    this.stopWidthSync();
    afterNextRender(
      () => {
        if (!this.options.isShown()) {
          this.overlay?.release();
        }
      },
      { injector: this.injector },
    );
  }

  /** Places the pane again (its content changed). */
  updatePosition(): void {
    this.overlay?.updatePosition();
  }

  private createOverlay(): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = this.overlays.connect(
      {
        origin: this.options.origin(),
        positions: menuPositions(MENU_ALIGN.Start),
        layer: OVERLAY_LAYER.Menu,
      },
      { injector: this.injector, onPositionChange: () => this.syncWidth() },
    );
    this.overlay = overlay;
    overlay.attachElement(this.options.popup());
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.attached.set(false);
        this.options.onDetached?.();
      }
    });
  }

  private syncWidth(): void {
    const property = this.options.exactWidth ? 'width' : 'min-width';
    this.overlay?.pane.style.setProperty(property, `${this.options.origin().offsetWidth}px`);
  }

  private watchWidth(): void {
    this.stopWidthSync();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncWidth();
      this.overlay?.updatePosition();
    });
    this.resizeObserver.observe(this.options.origin());
  }

  private stopWidthSync(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
