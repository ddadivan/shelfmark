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
import { overlayLayerClass, setOverlayLayer } from '../overlay/overlay-layer';
import { KEYBOARD_KEY } from '../keyboard';
import { DIALOG_ROLE } from './models/dialog-role.const';
import { DIALOG_SIZE } from './models/dialog-size.const';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';

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
    const scrimClose = dismissible && (config.scrimClose ?? true);
    const titleId = nextDialogId('ui-dialog-title');
    const holder: { ref?: UiDialogRef<R, C> } = {};

    const cdkRef = this.dialog.open<R, D, C>(component, {
      role: config.role ?? DIALOG_ROLE.Dialog,
      ariaModal: true,
      ariaLabelledBy: titleId,
      ariaDescribedBy: config.describedBy ?? null,
      data: config.data,
      autoFocus: config.autoFocus ?? 'first-tabbable',
      // The ref owns closing (leave animation first), so the CDK never closes on its own.
      disableClose: true,
      closeOnDestroy: true,
      backdropClass: ['ui-dialog-scrim', overlayLayerClass(OVERLAY_LAYER.Dialog)],
      positionStrategy: this.overlay.position().global(),
      injector: this.injector,
      providers: (ref) => {
        const uiRef = new UiDialogRef<R, C>(ref, this.injector);
        holder.ref = uiRef;
        const context: UiDialogContext = {
          titleId,
          size: config.size ?? DIALOG_SIZE.Sm,
          leaving: uiRef.leaving,
        };
        return [
          { provide: UiDialogRef, useValue: uiRef },
          { provide: UI_DIALOG_CONTEXT, useValue: context },
          { provide: UI_DIALOG_DATA, useValue: config.data },
        ];
      },
    });

    const result = holder.ref;
    if (!result) {
      throw new Error('ui-dialog: the dialog reference was not created.');
    }
    // On the host element (the stacking context), like every `UiOverlay` pane.
    setOverlayLayer(cdkRef.overlayRef.hostElement, OVERLAY_LAYER.Dialog);

    cdkRef.keydownEvents.subscribe((event) => {
      if (event.key === KEYBOARD_KEY.Escape && dismissible && !event.defaultPrevented) {
        event.preventDefault();
        result.close();
      }
    });
    cdkRef.backdropClick.subscribe(() => {
      if (scrimClose) {
        result.close();
      } else {
        // A click on the scrim must not leave focus on <body>. `_recaptureFocus` is internal CDK
        // API (no public equivalent; present in @angular/cdk 22.2.x): re-check on CDK upgrades.
        cdkRef.containerInstance._recaptureFocus?.();
      }
    });
    return result;
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
