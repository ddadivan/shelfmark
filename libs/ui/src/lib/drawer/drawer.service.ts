import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import type { ComponentType } from '@angular/cdk/portal';
import { inject, Injector, Service } from '@angular/core';
import { DIALOG_ROLE } from '../dialog/models/dialog-role.const';
import { UI_DIALOG_DATA } from '../dialog/models/ui-dialog-data.const';
import { openModalOverlay } from '../dialog/modal-overlay';
import type { UiDialogRef } from '../dialog/dialog-ref';
import type { UiDrawerConfig } from './models/drawer-config.interface';

/**
 * Opens a side drawer (the phone menu) on the CDK `Dialog`, through the same helper as
 * `DialogService`: focus trap, `aria-modal`, page scroll lock, the page hidden from assistive
 * technology, focus return, the scrim and the leave animation (`UiDialogRef`). Esc and a scrim
 * click close it. The content component renders `<ui-drawer closeLabel="…">`.
 */
@Service()
export class DrawerService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
   * Opens `component` in a drawer pinned to the inline-start edge. `R` is the type of the
   * result, `D` of `config.data`. Focus returns to the element that had it when it closes.
   */
  open<C, R = undefined, D = undefined>(
    component: ComponentType<C>,
    config: UiDrawerConfig<D>,
  ): UiDialogRef<R, C> {
    return openModalOverlay<C, R, D>(
      { dialog: this.dialog, overlay: this.overlay, injector: this.injector },
      component,
      {
        role: DIALOG_ROLE.Dialog,
        ariaLabel: config.ariaLabel,
        data: config.data,
        autoFocus: 'first-tabbable',
        dismissible: true,
        scrimClose: true,
        positionStrategy: this.overlay.position().global().top('0').start('0'),
        providers: () => [{ provide: UI_DIALOG_DATA, useValue: config.data }],
      },
    );
  }
}
