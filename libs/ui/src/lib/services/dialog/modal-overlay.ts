import type { ComponentType } from '@angular/cdk/portal';
import { UiDialogRef } from './dialog-ref';
import type { ModalOverlayDeps } from './models/modal-overlay-deps.interface';
import type { ModalOverlayOptions } from './models/modal-overlay-options.interface';
import { markFocusReturn } from './focus-return';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { raiseOverlayLayers } from '../overlay/overlay-stacking';
import { overlayLayerClass, setOverlayLayer } from '../overlay/overlay-layer';

/**
 * Focus fallback after a modal closed: when focus is on <body> (or nowhere), the container of
 * the topmost remaining modal takes it (the CDK container is `tabindex="-1"`), so its keyboard
 * handling (Esc, Tab) keeps working. Does nothing when focus is somewhere or no modal is left.
 */
function restoreFocusToTopModal(overlayContainer: HTMLElement | null): void {
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) {
    return;
  }
  const modals = overlayContainer?.querySelectorAll<HTMLElement>('.cdk-dialog-container');
  const top = modals?.item(modals.length - 1);
  if (top) {
    if (!top.hasAttribute('tabindex')) {
      top.setAttribute('tabindex', '-1');
    }
    top.focus({ preventScroll: true });
  }
}

/** True when the element that opened the modal can no longer take focus back. */
function isDetached(opener: Element | null): boolean {
  return !opener || opener === document.body || !opener.isConnected;
}

/**
 * Opens `component` as a modal on the CDK `Dialog` for `DialogService` and `DrawerService`:
 * the scrim and the `dialog` overlay layer, `aria-modal`, a ref that plays the leave animation
 * before the overlay goes away, and Esc / scrim closing (both off when not `dismissible`; the
 * scrim alone off when not `scrimClose`; both ignored while the ref is `locked`).
 */
export function openModalOverlay<C, R, D>(
  deps: ModalOverlayDeps,
  component: ComponentType<C>,
  options: ModalOverlayOptions<R, C, D>,
): UiDialogRef<R, C> {
  const opener = document.activeElement;
  const holder: { ref?: UiDialogRef<R, C> } = {};

  const cdkRef = deps.dialog.open<R, D, C>(component, {
    role: options.role,
    ariaModal: true,
    ariaLabelledBy: options.ariaLabelledBy ?? null,
    ariaLabel: options.ariaLabel ?? null,
    ariaDescribedBy: options.ariaDescribedBy ?? null,
    data: options.data,
    autoFocus: options.autoFocus,
    // The ref owns closing (leave animation first), so the CDK never closes on its own.
    disableClose: true,
    closeOnDestroy: true,
    backdropClass: ['ui-dialog-scrim', overlayLayerClass(OVERLAY_LAYER.Dialog)],
    positionStrategy: options.positionStrategy,
    injector: deps.injector,
    providers: (ref) => {
      const uiRef = new UiDialogRef<R, C>(ref, deps.injector);
      holder.ref = uiRef;
      return [{ provide: UiDialogRef, useValue: uiRef }, ...options.providers(uiRef)];
    },
  });

  const result = holder.ref;
  if (!result) {
    throw new Error('ui-dialog: the dialog reference was not created.');
  }
  // On the host element (the stacking context), like every `UiOverlay` pane.
  setOverlayLayer(cdkRef.overlayRef.hostElement, OVERLAY_LAYER.Dialog);
  // Popovers stack by show time: toasts (and menus, tooltips) that already exist must stay above.
  raiseOverlayLayers(cdkRef.overlayRef.hostElement);

  // The CDK has already tried to give focus back to the trigger. When that trigger is gone (a
  // menu item that opened a dialog inside a drawer) or cannot take focus, focus would stay on
  // <body>, outside every focus trap, and Esc would no longer reach the modal underneath.
  // (The host leaves the container on dispose, so the container is read now.)
  const overlayContainer = cdkRef.overlayRef.hostElement.parentElement;
  cdkRef.closed.subscribe(() => {
    markFocusReturn();
    // The caller's resolver only counts when the opener is gone (the CDK restored it otherwise).
    if (options.restoreFocus && isDetached(opener)) {
      options.restoreFocus()?.focus();
    }
    restoreFocusToTopModal(overlayContainer);
  });

  cdkRef.keydownEvents.subscribe((event) => {
    if (event.key === KEYBOARD_KEY.Escape && options.dismissible && !event.defaultPrevented) {
      event.preventDefault();
      if (!result.locked()) {
        result.close();
      }
    }
  });
  cdkRef.backdropClick.subscribe(() => {
    if (options.dismissible && options.scrimClose && !result.locked()) {
      result.close();
    } else {
      // A click on the scrim must not leave focus on <body>. `_recaptureFocus` is internal CDK
      // API (no public equivalent; present in @angular/cdk 22.2.x): re-check on CDK upgrades.
      cdkRef.containerInstance._recaptureFocus?.();
    }
  });
  return result;
}
