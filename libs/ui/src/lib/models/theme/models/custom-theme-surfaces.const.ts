import type { CustomThemeSurfaces } from './custom-theme-surfaces.interface';

/**
 * The token values an own accent colour is checked against, per Custom theme base: the fixed
 * surfaces and text of `tokens/_light.scss` / `_dark.scss` and the page backgrounds of
 * `tokens/_custom.scss`. `custom-theme-contrast.spec.ts` checks they equal the compiled Sass.
 */
export const CUSTOM_THEME_SURFACES: Readonly<Record<'light' | 'dark', CustomThemeSurfaces>> = {
  light: {
    surface: '#ffffff',
    surfaceHover: '#f5f5f5',
    surfacePressed: '#f0f0f0',
    text: '#1c1c1f',
    textMuted: '#6b6b70',
    backgrounds: { stone: '#f4f4f1', paper: '#f7f4ee', mist: '#f1f4f7', white: '#ffffff' },
  },
  dark: {
    surface: '#212125',
    surfaceHover: '#26262b',
    surfacePressed: '#2f2f35',
    text: '#ececee',
    textMuted: '#a3a3aa',
    backgrounds: { graphite: '#19191c', ink: '#12141a', forest: '#101411', black: '#000000' },
  },
};
