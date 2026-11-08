import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Service, type ComponentRef } from '@angular/core';
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { UiOverlay } from '../overlay/overlay.service';
import { TOAST_CLOSE_REASON } from './models/toast-close-reason.const';
import type { ToastCloseReason } from './models/toast-close-reason.type';
import { TOAST_SHORTCUT } from './models/toast-shortcut.const';
import type { ToastOptions } from './models/toast-options.interface';
import type { ToastRef } from './models/toast-ref.interface';
import { ToastRegionComponent } from './toast-region.component';
import { ToastStore } from './toast-store';

/**
 * Short confirmations and undo. `show()` renders a `ui-toast` in the `toast` overlay layer
 * (bottom-centre on phones, bottom-left from the tablet breakpoint up). One toast at a time:
 * a new one replaces the older. It lasts 4 s (8 s with an action) and waits while hovered or
 * focused; it never takes focus. The live region is created once, with the service, and stays
 * in the page. Inject the service early (a field initialiser is fine) so the region has been
 * rendered before the first toast, which keeps that first one announced.
 */
@Service()
export class ToastService {
  private readonly store = inject(ToastStore);
  private readonly region: ConnectedOverlay;
  private readonly regionRef: ComponentRef<ToastRegionComponent>;
  /** Where focus was when `focusAction()` took it, so it can go back when the toast closes. */
  private returnTo: { readonly id: number; readonly element: HTMLElement } | undefined;

  constructor() {
    this.region = inject(UiOverlay).global({
      layer: OVERLAY_LAYER.Toast,
      panelClass: 'ui-toast-pane',
    });
    this.regionRef = this.region.attach(new ComponentPortal(ToastRegionComponent));
  }

  show(options: ToastOptions): ToastRef {
    // A toast that appears over a dialog or drawer opened after the region must come to the front
    // (top-layer order is show order). A toast already on screen is up there from its own raise.
    // Toasts that are only leaving are not in the store, so a toast shown during a leave counts as
    // the first; the raise skips a region that still has a leaving toast (`raiseOverlayLayers`).
    const first = this.store.items().length === 0;
    const item = this.store.push(options);
    if (first) {
      this.region.raise();
    }
    void item.closed.then((reason) => {
      this.restoreFocus(item.id, reason);
    });
    return { dismiss: () => this.store.dismiss(item.id), closed: item.closed };
  }

  /** Closes the toast on screen, if any. */
  dismiss(): void {
    const current = this.store.items()[0];
    if (current) {
      this.store.dismiss(current.id);
    }
  }

  /**
   * Moves focus to the action button of the toast on screen. Only an explicit call moves focus
   * (a toast never takes it by itself); while focused the timer is paused. Does nothing without
   * a toast or an action. The app binds a shortcut to it, so keyboard users can reach an Undo
   * before the toast closes.
   */
  focusAction(): void {
    if (!this.store.items()[0]?.action) {
      return;
    }
    const regionElement = this.regionRef.location.nativeElement as HTMLElement;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !regionElement.contains(active)
    ) {
      this.returnTo = { id: this.store.items()[0].id, element: active };
    }
    const actions = regionElement.querySelectorAll<HTMLElement>('.ui-toast__action');
    // A replaced toast can still be leaving: the newest one is last.
    actions.item(actions.length - 1).focus();
  }

  /**
   * Handles the global shortcut (`TOAST_SHORTCUT`, Alt+Shift+T): focuses the action of the toast
   * on screen and cancels the key. Returns true when it did. The app calls it from its document
   * keydown handler.
   */
  handleShortcut(event: KeyboardEvent): boolean {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.code !== TOAST_SHORTCUT.code ||
      !event.altKey ||
      !event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      !this.store.items()[0]?.action
    ) {
      return false;
    }
    event.preventDefault();
    this.focusAction();
    return true;
  }

  /**
   * After the toast that was focused closes (action or dismissed, not replaced: the newer toast
   * stays where it is), focus goes back to where it was. It only moves when it is still in the
   * region (or lost to the body): the user or an action may have moved it.
   */
  private restoreFocus(id: number, reason: ToastCloseReason): void {
    const target = this.returnTo;
    if (target?.id !== id) {
      return;
    }
    this.returnTo = undefined;
    if (reason !== TOAST_CLOSE_REASON.Action && reason !== TOAST_CLOSE_REASON.Dismissed) {
      return;
    }
    if (!target.element.isConnected) {
      return;
    }
    const active = document.activeElement;
    const regionElement = this.regionRef.location.nativeElement as HTMLElement;
    if (!active || active === document.body || regionElement.contains(active)) {
      target.element.focus();
    }
  }
}
