/**
 * What the options of `ui-theme-picker` look like: theme thumbnails (page, panel and accent),
 * round accent swatches, or background tiles. Every drawing takes its colours from the theme
 * attributes of its option, so it shows the real token values.
 */
export const THEME_PICKER_KIND = {
  Theme: 'theme',
  Accent: 'accent',
  Background: 'background',
} as const;
