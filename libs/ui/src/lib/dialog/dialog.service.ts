import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import type { ComponentType } from '@angular/cdk/portal';
import { inject, Injector, Service } from '@angular/core';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { nextDialogId } from './dialog-id';
import { UiDialogRef } from './dialog-ref';
import type { ConfirmDialogConfig } from './models/confirm-config.interface';
import type { ConfirmDialogData } from './models/confirm-dialog-data.interface';
import type { UiDialogConfig } from './models/dialog-config.interface';
import type { UiDialogContext } from './models/dialog-context.interface';
import { UI_DIALOG_CONTEXT } from './models/ui-dialog-context.const';
import { UI_DIALOG_DATA } from './models/ui-dialog-data.const';
import { openModalOverlay } from './modal-overlay';
import { DIALOG_ROLE } from './models/dialog-role.const';
import { DIALOG_SIZE } from './models/dialog-size.const';
import { DIALOG_VARIANT } from './models/dialog-variant.const';

/**
 * Opens dialogs on the CDK `Dialog`: focus trap, focus restore, `aria-modal`, page scroll
 * lock and the hiding of the page from assistive technology are the CDK's. On top of it:
 * the dialog layer class on the host element, the scrim, the leave animation (`UiDialogRef`)
 * and a phone bottom sheet (`ui-dialog` draws it from the viewport width).
 *
 * The content component renders `<ui-dialog title="…">` and closes through the injected
 * `UiDialogRef`; the result comes back from `afterClosed()` / `result`.
 */
@Service()
export class DialogService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  /**
   * Opens `component` in a dialog. `R` is the type of the result, `D` of `config.data`.
   * Esc closes it (and a scrim click, unless `scrimClose` is `false`); `dismissible: false`
   * turns both off. Focus returns to the element that had it when the dialog closes.
   */
  open<C, R = undefined, D = undefined>(
    component: ComponentType<C>,
    config: UiDialogConfig<D> = {},
  ): UiDialogRef<R, C> {
    const dismissible = config.dismissible ?? true;
    const titleId = nextDialogId('ui-dialog-title');
    const variant = config.variant ?? DIALOG_VARIANT.Default;

    return openModalOverlay<C, R, D>({ dialog: this.dialog, injector: this.injector }, component, {
      role: config.role ?? DIALOG_ROLE.Dialog,
      ariaLabelledBy: titleId,
      ariaDescribedBy: config.describedBy ?? null,
      data: config.data,
      autoFocus: config.autoFocus ?? 'first-tabbable',
      dismissible,
      scrimClose: config.scrimClose ?? true,
      restoreFocus: config.restoreFocus,
      // The command dialog sits at the top (its panel keeps the 96px gap); others are centred.
      positionStrategy:
        variant === DIALOG_VARIANT.Command
          ? this.overlay.position().global().top('0').centerHorizontally()
          : this.overlay.position().global(),
      providers: (uiRef) => {
        const context: UiDialogContext = {
          titleId,
          size: config.size ?? DIALOG_SIZE.Sm,
          variant,
          leaving: uiRef.leaving,
        };
        return [
          { provide: UI_DIALOG_CONTEXT, useValue: context },
          { provide: UI_DIALOG_DATA, useValue: config.data },
        ];
      },
    });
  }

  /**
   * Yes / no question. Resolves `true` for the confirm button and `false` for Cancel, the close
   * button, Esc and a scrim click. `destructive` makes the confirm button red, uses
   * `alertdialog`, ignores the scrim and puts focus on Cancel; otherwise confirm has focus.
   */
  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    const destructive = config.destructive ?? false;
    const textId = nextDialogId('ui-dialog-text');
    const ref = this.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        data: { ...config, textId },
        role: destructive ? DIALOG_ROLE.AlertDialog : DIALOG_ROLE.Dialog,
        scrimClose: !destructive,
        describedBy: textId,
        autoFocus: false,
      },
    );
    return ref.result.then((value) => value === true);
  }
}
