import type { IconName } from '../../icon/models/icon-name.type';
import { TOAST_KIND } from './toast-kind.const';
import type { ToastKind } from './toast-kind.type';

/** The icon each toast kind draws. */
export const TOAST_KIND_ICON = {
  [TOAST_KIND.Info]: 'info',
  [TOAST_KIND.Success]: 'check',
  [TOAST_KIND.Error]: 'error',
} as const satisfies Record<ToastKind, IconName>;
