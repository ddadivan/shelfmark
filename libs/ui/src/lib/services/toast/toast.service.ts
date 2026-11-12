import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Service, type ComponentRef } from '@angular/core';
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { UiOverlay } from '../overlay/overlay.service';
import { TOAST_CLOSE_REASON } from './models/toast-close-reason.const';
import type { ToastCloseReason } from './models/toast-close-reason.type';
import { TOAST_SHORTCUT } from './models/toast-shortcut.const';
import type { ToastItem } from '../../components/toast/models/toast-item.interface';
import type { ToastOptions } from './models/toast-options.interface';
import type { ToastRef } from './models/toast-ref.interface';
import { ToastRegionComponent } from '../../components/toast/toast-region/toast-region.component';
import { ToastStore } from './toast-store';

/**
 * Short confirmations, status and undo. `show()` renders a `ui-toast` in the `toast` overlay
 * layer (bottom centre on every screen, 24px up; the app lifts it with `--ui-toast-offset`).
 * Up to three stack, the newest in front; a fourth pushes out the oldest (`replaced`). Each stays
 * for the time of its kind (see `toastDefaultDuration`), waits while hovered or focused, and never
 * takes focus. The live regions (polite for everything, assertive for `danger`) are created once,
 * with the service, and stay in the page. Inject the service early (a field initialiser is fine)
 * so the regions have been rendered before the first toast, which keeps that first one announced.
 *
 * Keyboard: while an Undo toast is visible Ctrl/⌘+Z runs it, and Esc dismisses the newest toast;
 * both are ignored in editable fields and inside dialogs, menus and listboxes, and when another
 * handler already used the key.
 */
@Service()
export class ToastService {
  private readonly store = inject(ToastStore);
  private readonly region: ConnectedOverlay;
  private readonly regionRef: ComponentRef<ToastRegionComponent>;
  /** Where focus was when `focusAction()` took it, so it can go back when the toast closes. */
  private returnTo: { readonly id: number; readonly element: HTMLElement } | undefined;

  constructor() {
    const document = inject(DOCUMENT);
    const onKeydown = (event: KeyboardEvent): void => this.handleKeydown(event);
    document.addEventListener('keydown', onKeydown);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKeydown));
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

  /** Closes the newest toast on screen, if any. */
  dismiss(): void {
    const current = this.store.items().at(-1);
    if (current) {
      this.store.dismiss(current.id);
    }
  }

  /**
   * Moves focus to the action button of the newest toast that has one. Only an explicit call
   * moves focus (a toast never takes it by itself); while focused the timer is paused. Does
   * nothing without a toast or an action. The app binds a shortcut to it, so keyboard users can
   * reach an Undo before the toast closes.
   */
  focusAction(): void {
    const target = this.actionable();
    if (!target) {
      return;
    }
    const regionElement = this.regionRef.location.nativeElement as HTMLElement;
    const button = regionElement.querySelector<HTMLElement>(
      `[data-toast-id="${target.id}"] .ui-toast__action`,
    );
    if (!button) {
      return;
    }
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !regionElement.contains(active)
    ) {
      this.returnTo = { id: target.id, element: active };
    }
    button.focus();
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
      !this.actionable()
    ) {
      return false;
    }
    event.preventDefault();
    this.focusAction();
    return true;
  }

  /** Ctrl/⌘+Z runs the newest Undo toast; Esc dismisses the newest toast. */
  private handleKeydown(event: KeyboardEvent): void {
    const newest = this.store.items().at(-1);
    if (!newest || event.defaultPrevented || event.isComposing || isInOwnedContext(event)) {
      return;
    }
    if (event.key === KEYBOARD_KEY.Escape) {
      event.preventDefault();
      this.store.dismiss(newest.id);
      return;
    }
    const undo = this.store.items().findLast((item) => item.undo);
    if (
      undo &&
      event.code === UNDO_KEY_CODE &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      this.store.runAction(undo);
    }
  }

  /** The newest toast that has an action. */
  private actionable(): ToastItem | undefined {
    return this.store.items().findLast((item) => item.action);
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

/** `KeyboardEvent.code` of the Z key: Ctrl/⌘+Z undoes (matched by `code`, so layouts still work). */
const UNDO_KEY_CODE = 'KeyZ';

/** True where the key belongs to something else: an editable field, a dialog, menu or listbox. */
function isInOwnedContext(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }
  return (
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ) !== null
  );
}
