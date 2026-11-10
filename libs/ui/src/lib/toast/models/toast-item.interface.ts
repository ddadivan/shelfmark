import type { ToastAction } from './toast-action.interface';
import type { ToastCloseReason } from './toast-close-reason.type';
import type { ToastFolder } from './toast-folder.interface';
import type { ToastKind } from './toast-kind.type';

/** A toast on screen (internal): the options with the defaults applied and an id. */
export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly title: string;
  readonly detail: string | undefined;
  readonly thumb: string | undefined;
  readonly folder: ToastFolder | undefined;
  readonly action: ToastAction | undefined;
  readonly secondary: ToastAction | undefined;
  readonly duration: number;
  /** An action with the Undo duration: it shows the countdown line and answers Ctrl/⌘+Z. */
  readonly undo: boolean;
  readonly actionHint: string | undefined;
  /** Resolves once with the close reason. */
  readonly closed: Promise<ToastCloseReason>;
}
