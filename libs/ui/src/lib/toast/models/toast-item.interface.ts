import type { ToastAction } from './toast-action.interface';
import type { ToastKind } from './toast-kind.type';

/** A toast on screen (internal): the options with the defaults applied and an id. */
export interface ToastItem {
  readonly id: number;
  readonly kind: ToastKind;
  readonly text: string;
  readonly action: ToastAction | undefined;
  readonly duration: number;
}
