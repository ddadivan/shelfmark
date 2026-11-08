import type { IconSize } from '../../icon/models/icon-size.type';
import type { ButtonSize } from './button-size.type';

/** Icon size in px per button size (spec: 16px icons, 20px on `lg`). */
export const BUTTON_ICON_SIZE: Record<ButtonSize, IconSize> = {
  sm: 16,
  md: 16,
  lg: 20,
};

/** Icon size of a floating action button. */
export const BUTTON_FAB_ICON_SIZE: IconSize = 24;
