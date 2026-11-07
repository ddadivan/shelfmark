import { inject, Service } from '@angular/core';
import { ToastService } from '@shelfmark/ui';
import { DELETE_UNDO_MS } from './models/delete-undo.const';
import type { UndoToastOptions } from './models/undo-toast-options.interface';

/**
 * A toast with an Undo action that calls `onExpire` when the Undo window ends without Undo.
 * This is the one place that knows how the window ends: today a timer of the same length as
 * the toast, so it can drift from the toast when the toast is paused by hover or focus. When
 * `ToastRef.closed` lands in `libs/ui` (branch `feat/74-toast-closed`), replace the timer with
 * `ref.closed.then((reason) => reason !== 'action' && options.onExpire())` and nothing else
 * changes.
 */
@Service()
export class UndoToastService {
  private readonly toasts = inject(ToastService);

  show(options: UndoToastOptions): void {
    let settled = false;
    const settle = (): boolean => {
      const first = !settled;
      settled = true;
      return first;
    };
    this.toasts.show({
      text: options.text,
      duration: DELETE_UNDO_MS,
      action: {
        label: options.actionLabel,
        run: () => {
          if (settle()) {
            options.onUndo();
          }
        },
      },
    });
    setTimeout(() => {
      if (settle()) {
        options.onExpire();
      }
    }, DELETE_UNDO_MS);
  }
}
