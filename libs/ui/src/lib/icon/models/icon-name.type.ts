import { ICON_NAMES } from './icon-names.const';

/** Name of an icon in the sprite, without the `sm-` prefix. */
export type IconName = (typeof ICON_NAMES)[number];
