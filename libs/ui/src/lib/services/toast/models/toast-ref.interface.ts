import type { ToastCloseReason } from './toast-close-reason.type';

export interface ToastRef {
  /** Closes the toast; does nothing if it is already gone or was replaced. */
  dismiss(): void;
  /** Resolves exactly once, when the toast closes, with the reason. Never rejects. */
  readonly closed: Promise<ToastCloseReason>;
}
