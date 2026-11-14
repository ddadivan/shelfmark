import type { Dialog } from '@angular/cdk/dialog';
import type { Injector } from '@angular/core';

/** The services a service passes to `openModalOverlay` (it cannot `inject()` them itself). */
export interface ModalOverlayDeps {
  readonly dialog: Dialog;
  readonly injector: Injector;
}
