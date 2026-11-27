import { inject, Service } from '@angular/core';
import {
  TOAST_CLOSE_REASON,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type ToastRef,
} from '@shelfmark/ui';
import { Translate } from '../i18n/translate.service';
import type { RetryToastOptions } from './models/retry-toast-options.interface';
import type { UndoToastOptions } from './models/undo-toast-options.interface';

/**
 * The toasts with one action. `show()` is a toast with an Undo action and a countdown line (8 s),
 * red for a delete (`kind` changes it). `onUndo` runs when Undo is pressed; `onExpire`, when given,
 * runs when the toast closes for any other reason (timeout, dismissed, replaced by a newer toast),
 * so the change is committed exactly when the user can no longer undo it. The toast's own timer
 * decides when, so hovering or focusing it extends the window. `retry()` is the red toast of a
 * failed change with a Retry action.
 */
@Service()
export class UndoToastService {
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);

  /** Shows the toast; `dismiss()` closes it as expired (the change is committed then). */
  show(options: UndoToastOptions): ToastRef {
    const ref = this.toasts.show({
      kind: options.kind ?? TOAST_KIND.Danger,
      title: options.title,
      detail: options.detail,
      ...(options.folder && { folder: options.folder }),
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.translate.t('toast.actionHint', {
        shortcut: toastShortcutLabel(),
        action: options.actionLabel,
      }),
      action: { label: options.actionLabel, run: () => options.onUndo() },
    });
    const { onExpire } = options;
    if (onExpire) {
      void ref.closed.then((reason) => {
        if (reason !== TOAST_CLOSE_REASON.Action) {
          onExpire();
        }
      });
    }
    return ref;
  }

  /** A red toast that a change failed, with a Retry action. */
  retry(options: RetryToastOptions): ToastRef {
    return this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: options.title,
      detail: options.detail,
      action: { label: this.translate.t('links.item.retry'), run: () => options.onRetry() },
    });
  }
}
