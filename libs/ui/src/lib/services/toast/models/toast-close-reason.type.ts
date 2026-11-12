import type { TOAST_CLOSE_REASON } from './toast-close-reason.const';

/** Why a toast closed (see `ToastRef.closed`). */
export type ToastCloseReason = (typeof TOAST_CLOSE_REASON)[keyof typeof TOAST_CLOSE_REASON];
