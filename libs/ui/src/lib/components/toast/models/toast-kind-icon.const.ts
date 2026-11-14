import type { IconName } from '../../icon/models/icon-name.type';
import { TOAST_KIND } from './toast-kind.const';
import type { ToastKind } from './toast-kind.type';

/**
 * The glyph each toast kind draws in its lead: the tinted icon of success, danger, warn and
 * info, and the fallback of `saved` (no thumbnail) and `moved` (no folder tile).
 */
export const TOAST_KIND_ICON = {
  [TOAST_KIND.Saved]: 'saved-link',
  [TOAST_KIND.Moved]: 'folder',
  [TOAST_KIND.Success]: 'check',
  [TOAST_KIND.Danger]: 'error',
  [TOAST_KIND.Warn]: 'warning',
  [TOAST_KIND.Info]: 'info',
} as const satisfies Record<ToastKind, IconName>;
