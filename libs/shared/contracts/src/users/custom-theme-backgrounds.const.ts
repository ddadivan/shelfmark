import { CUSTOM_THEME_BACKGROUND } from './custom-theme-background.const';
import type { CustomThemeBackground } from './custom-theme-background.type';
import type { CustomThemeBase } from './custom-theme-base.type';

/**
 * The backgrounds offered on each base, in the order they are shown; the first one is what a
 * base switch picks. A background of the other base is invalid (400 from the API).
 */
export const CUSTOM_THEME_BACKGROUNDS: Readonly<
  Record<CustomThemeBase, readonly CustomThemeBackground[]>
> = {
  light: [
    CUSTOM_THEME_BACKGROUND.Stone,
    CUSTOM_THEME_BACKGROUND.Paper,
    CUSTOM_THEME_BACKGROUND.Mist,
    CUSTOM_THEME_BACKGROUND.White,
  ],
  dark: [
    CUSTOM_THEME_BACKGROUND.Graphite,
    CUSTOM_THEME_BACKGROUND.Ink,
    CUSTOM_THEME_BACKGROUND.Forest,
    CUSTOM_THEME_BACKGROUND.Black,
  ],
};
