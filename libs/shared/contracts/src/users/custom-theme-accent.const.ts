/**
 * The curated accent colours of a custom theme (Themes mockup). Each name has a light and a dark
 * set of token values in `libs/ui` (`styles/tokens/_custom.scss`), checked for WCAG AA by
 * `custom-theme-contrast.spec.ts` there. An own colour (`#rrggbb`, #315) is allowed too; the app draws it in its nearest accessible shade.
 */
export const CUSTOM_THEME_ACCENT = {
  Sage: 'sage',
  Ocean: 'ocean',
  Plum: 'plum',
  Clay: 'clay',
  Amber: 'amber',
  Rose: 'rose',
  Teal: 'teal',
  Graphite: 'graphite',
} as const;
