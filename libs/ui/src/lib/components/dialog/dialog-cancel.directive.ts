import { Directive, inject } from '@angular/core';
import { DialogComponent } from './dialog.component';

/**
 * Marks the plain Cancel button of a dialog footer (#512). On the phone sheet a dialog that has
 * its own close button (`closeLabel`) drops it: the x does the same. Confirm dialogs without a
 * close button keep their Cancel. Desktop dialogs are unchanged. Put it on the `ui-button`:
 * `<ui-button uiDialogCancel (click)="cancel()">Cancel</ui-button>`.
 */
@Directive({
  selector: '[uiDialogCancel]',
  host: {
    '[class.ui-dialog-cancel--with-close]': '!!dialog?.closeLabel()',
  },
})
export class DialogCancelDirective {
  protected readonly dialog = inject(DialogComponent, { optional: true });
}
