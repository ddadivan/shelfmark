import type { ToastItem } from './toast-item.interface';

/** A toast with its place in the stack (internal). */
export interface ToastStackEntry {
  readonly item: ToastItem;
  /** 0 for the newest (in front), 1 and 2 for the ones behind it. */
  readonly depth: number;
  /** Position from the oldest (0); stacking order and the order when fanned out. */
  readonly index: number;
}
