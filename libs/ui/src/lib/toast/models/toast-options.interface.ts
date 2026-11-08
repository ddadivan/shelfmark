import type { ToastAction } from './toast-action.interface';
import type { ToastKind } from './toast-kind.type';

export interface ToastOptions {
  /** Short, past-tense text, already translated ("Link saved"). */
  readonly text: string;
  /** Default `info`. */
  readonly kind?: ToastKind;
  readonly action?: ToastAction;
  /** Milliseconds before it closes. Default 4000, or 8000 with an action; 0 keeps it until dismissed. */
  readonly duration?: number;
  /**
   * Screen-reader hint announced with a toast that has an action, already translated
   * ("Press Alt+Shift+T to reach Undo"). Use `toastShortcutLabel()` for the key.
   */
  readonly actionHint?: string;
}
