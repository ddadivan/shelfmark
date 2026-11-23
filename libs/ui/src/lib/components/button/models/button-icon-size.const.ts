import type { IconSize } from '../../icon/models/icon-size.type';
import { BUTTON_SIZE } from './button-size.const';
import type { ButtonSize } from './button-size.type';

/** Icon size in px per button size (Shelf: 16px at every size, 8px gap to the label). */
export const BUTTON_ICON_SIZE: Record<ButtonSize, IconSize> = {
  [BUTTON_SIZE.Sm]: 16,
  [BUTTON_SIZE.Md]: 16,
  [BUTTON_SIZE.Lg]: 16,
};
