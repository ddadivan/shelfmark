import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChildren,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { DialogComponent } from './dialog.component';
import { UiDialogRef } from './dialog-ref';
import { injectDialogData } from './inject-dialog-data';
import type { ConfirmDialogData } from './models/confirm-dialog-data.interface';

/**
 * Content of `DialogService.confirm()`. Cancel (secondary) sits left of the confirm button.
 * Focus goes to confirm, or to Cancel for a destructive action, so a stray Enter cannot delete.
 */
@Component({
  selector: 'ui-confirm-dialog',
  imports: [ButtonComponent, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly config = injectDialogData<ConfirmDialogData>();
  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly buttons = viewChildren(ButtonComponent);

  constructor() {
    afterNextRender(() => {
      // Buttons in order: [close?], cancel, confirm.
      const all = this.buttons();
      const confirm = all[all.length - 1];
      const cancel = all[all.length - 2];
      (this.config.destructive ? cancel : confirm)?.focus();
    });
  }

  protected answer(value: boolean): void {
    this.ref.close(value);
  }
}
