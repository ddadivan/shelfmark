import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  TOAST_CLOSE_REASON,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type ToastRef,
} from '@shelfmark/ui';
import { DELETE_UNDO_MS } from './models/delete-undo.const';
import type { UndoToastOptions } from './models/undo-toast-options.interface';

/**
 * A red toast with an Undo action and a countdown line (8 s). `onUndo` runs when Undo is pressed; `onExpire` runs when the toast
 * closes for any other reason (timeout, dismissed, replaced by a newer toast), so the change is
 * committed exactly when the user can no longer undo it. The toast's own timer decides when, so
 * hovering or focusing it extends the window.
 */
@Service()
export class UndoToastService {
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Shows the toast; `dismiss()` closes it as expired (the change is committed then). */
  show(options: UndoToastOptions): ToastRef {
    const ref = this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: options.title,
      detail: options.detail,
      duration: DELETE_UNDO_MS,
      actionHint: this.transloco.translate('toast.actionHint', {
        shortcut: toastShortcutLabel(),
        action: options.actionLabel,
      }),
      action: { label: options.actionLabel, run: () => options.onUndo() },
    });
    void ref.closed.then((reason) => {
      if (reason !== TOAST_CLOSE_REASON.Action) {
        options.onExpire();
      }
    });
    return ref;
  }
}
