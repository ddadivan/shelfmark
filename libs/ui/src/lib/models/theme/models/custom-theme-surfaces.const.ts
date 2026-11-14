import type { CustomThemeSurfaces } from './custom-theme-surfaces.interface';

/**
 * The token values an own accent colour is checked against, per Custom theme base: the fixed
 * surfaces and text of `tokens/_light.scss` / `_dark.scss` and the page backgrounds of
 * `tokens/_custom.scss`. `custom-theme-contrast.spec.ts` checks they equal the compiled Sass.
 */
export const CUSTOM_THEME_SURFACES: Readonly<Record<'light' | 'dark', CustomThemeSurfaces>> = {
  light: {
    surface: '#ffffff',
    surfaceHover: '#eeeeea',
    surfacePressed: '#e6e6e1',
    text: '#18181a',
    textMuted: '#636368',
    backgrounds: { stone: '#f4f4f1', paper: '#f7f4ee', mist: '#f1f4f7', white: '#ffffff' },
  },
  dark: {
    surface: '#1a1a1d',
    surfaceHover: '#242428',
    surfacePressed: '#2c2c31',
    text: '#ededef',
    textMuted: '#9a9aa0',
    backgrounds: { graphite: '#111113', ink: '#12141a', forest: '#101411', black: '#000000' },
  },
};
