import type { IconSize } from '../../icon/models/icon-size.type';
import { BUTTON_SIZE } from './button-size.const';
import type { ButtonSize } from './button-size.type';

/** Icon size in px per button size (24px, the grid of the icon set; 20px on `sm`, whose box is 30px). */
export const BUTTON_ICON_SIZE: Record<ButtonSize, IconSize> = {
  [BUTTON_SIZE.Sm]: 20,
  [BUTTON_SIZE.Md]: 24,
  [BUTTON_SIZE.Lg]: 24,
};
