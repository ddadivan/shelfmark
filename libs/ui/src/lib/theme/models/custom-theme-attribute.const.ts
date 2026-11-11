/**
 * The attributes next to `data-theme="custom"` that pick the Custom theme's token values
 * (`tokens/_custom.scss`). Values are the contracts' `CUSTOM_THEME_*` names.
 */
export const CUSTOM_THEME_ATTRIBUTE = {
  Base: 'data-custom-base',
  Accent: 'data-custom-accent',
  Background: 'data-custom-background',
  Corners: 'data-custom-corners',
} as const;
