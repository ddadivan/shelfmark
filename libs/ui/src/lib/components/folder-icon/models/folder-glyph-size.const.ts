import { ICON_SIZE } from '../../icon/models/icon-size.const';
import type { IconSize } from '../../icon/models/icon-size.type';
import type { FolderIconSize } from './folder-icon-size.type';

/**
 * Glyph size per tile size. The design draws 14 / 16 / 20 / 26 px; `ui-icon` only has 16 / 20 /
 * 24, so the nearest allowed sizes are used (sm and md share 16, xl uses 24).
 */
export const FOLDER_GLYPH_SIZE: Record<FolderIconSize, IconSize> = {
  sm: ICON_SIZE.Sm,
  md: ICON_SIZE.Sm,
  lg: ICON_SIZE.Md,
  xl: ICON_SIZE.Lg,
};
