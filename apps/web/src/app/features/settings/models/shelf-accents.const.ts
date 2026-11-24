import { CUSTOM_THEME_ACCENT, type CustomThemeAccent } from '@shelfmark/contracts';

/**
 * The accents the Appearance picker offers (Shelf 05-settings: "Graphite keeps the interface
 * quiet; Ink and Sage add one colour"). The older curated names stay valid on the account and
 * show only while one of them is chosen.
 */
export const SHELF_ACCENTS: readonly CustomThemeAccent[] = [
  CUSTOM_THEME_ACCENT.Graphite,
  CUSTOM_THEME_ACCENT.Ink,
  CUSTOM_THEME_ACCENT.Sage,
];
