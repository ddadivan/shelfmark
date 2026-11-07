import type { ComponentType } from '@angular/cdk/portal';
import { UiDialogRef } from './dialog-ref';
import type { ModalOverlayDeps } from './models/modal-overlay-deps.interface';
import type { ModalOverlayOptions } from './models/modal-overlay-options.interface';
import { KEYBOARD_KEY } from '../keyboard';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { overlayLayerClass, setOverlayLayer } from '../overlay/overlay-layer';

/**
 * Opens `component` as a modal on the CDK `Dialog` for `DialogService` and `DrawerService`:
 * the scrim and the `dialog` overlay layer, `aria-modal`, a ref that plays the leave animation
 * before the overlay goes away, and Esc / scrim closing (both off when not `dismissible`; the
 * scrim alone off when not `scrimClose`).
 */
export function openModalOverlay<C, R, D>(
  deps: ModalOverlayDeps,
  component: ComponentType<C>,
  options: ModalOverlayOptions<R, C, D>,
): UiDialogRef<R, C> {
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

  cdkRef.keydownEvents.subscribe((event) => {
    if (event.key === KEYBOARD_KEY.Escape && options.dismissible && !event.defaultPrevented) {
      event.preventDefault();
      result.close();
    }
  });
  cdkRef.backdropClick.subscribe(() => {
    if (options.dismissible && options.scrimClose) {
      result.close();
    } else {
      // A click on the scrim must not leave focus on <body>. `_recaptureFocus` is internal CDK
      // API (no public equivalent; present in @angular/cdk 22.2.x): re-check on CDK upgrades.
      cdkRef.containerInstance._recaptureFocus?.();
    }
  });
  return result;
}
