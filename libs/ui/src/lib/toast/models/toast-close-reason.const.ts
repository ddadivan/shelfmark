/** Why a toast closed (see `ToastRef.closed`). */
export const TOAST_CLOSE_REASON = {
  Action: 'action',
  Timeout: 'timeout',
  Dismissed: 'dismissed',
  Replaced: 'replaced',
} as const;
