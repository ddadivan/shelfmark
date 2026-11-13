import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import type { ComponentType } from '@angular/cdk/portal';
import { inject, Injector, Service } from '@angular/core';
import { trackInputModality } from '../dialog/focus-return';
import { DIALOG_ROLE } from '../dialog/models/dialog-role.const';
import { UI_DIALOG_DATA } from '../dialog/models/ui-dialog-data.const';
import { openModalOverlay } from '../dialog/modal-overlay';
import type { UiDialogRef } from '../dialog/dialog-ref';
import { DRAWER_SIDE } from '../../components/drawer/models/drawer-side.const';
import type { UiDrawerConfig } from './models/drawer-config.interface';

/**
 * Opens a side drawer (the phone menu) on the CDK `Dialog`, through the same helper as
 * `DialogService`: focus trap, `aria-modal`, page scroll lock, the page hidden from assistive
 * technology, focus return, the scrim and the leave animation (`UiDialogRef`). Esc and a scrim
 * click close it. The content component renders `<ui-drawer closeLabel="…">`.
 */
@Service()
export class DrawerService {
  /** Remembers pointer or key, so a closing modal returns focus the way its trigger was used. */
  private readonly modality = trackInputModality();
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
   * Opens `component` in a drawer pinned to the inline-start edge (`side: 'end'`: inline-end). `R` is the type of the
   * result, `D` of `config.data`. Focus returns to the element that had it when it closes.
   */
  open<C, R = undefined, D = undefined>(
    component: ComponentType<C>,
    config: UiDrawerConfig<D>,
  ): UiDialogRef<R, C> {
    return openModalOverlay<C, R, D>({ dialog: this.dialog, injector: this.injector }, component, {
      role: DIALOG_ROLE.Dialog,
      ariaLabel: config.ariaLabel,
      data: config.data,
      autoFocus: 'first-tabbable',
      dismissible: true,
      scrimClose: true,
      restoreFocus: config.restoreFocus,
      positionStrategy:
        config.side === DRAWER_SIDE.End
          ? this.overlay.position().global().top('0').end('0')
          : this.overlay.position().global().top('0').start('0'),
      providers: () => [{ provide: UI_DIALOG_DATA, useValue: config.data }],
    });
  }
}
