import type { IconSize } from '../../icon/models/icon-size.type';
import { BUTTON_SIZE } from './button-size.const';
import type { ButtonSize } from './button-size.type';

/** Icon size in px per button size (spec: 16px icons, 20px on `lg`). */
export const BUTTON_ICON_SIZE: Record<ButtonSize, IconSize> = {
  [BUTTON_SIZE.Sm]: 16,
  [BUTTON_SIZE.Md]: 16,
  [BUTTON_SIZE.Lg]: 20,
};
