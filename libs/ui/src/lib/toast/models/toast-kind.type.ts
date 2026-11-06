import type { TOAST_KIND } from './toast-kind.const';

/** What the toast reports; each kind has its own icon (never colour alone). */
export type ToastKind = (typeof TOAST_KIND)[keyof typeof TOAST_KIND];
