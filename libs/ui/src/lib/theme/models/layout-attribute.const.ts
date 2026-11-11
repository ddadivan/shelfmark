/**
 * The `<html>` attributes of Settings › Appearance › Text and layout and Cards (#285). The app's
 * ThemeService is their only writer; it leaves an attribute out while the default is chosen.
 * `global.scss` reacts to text size (root font size), font (`--font-sans`) and density (the
 * `--density-*` tokens); `ui-card`, `ui-theme-preview` and the app's link card react to the card
 * options. The values are the contracts' `TEXT_SIZE`, `APP_FONT`, `DENSITY`, `CARD_PREVIEW`, and
 * `LAYOUT_OFF` for a card part that is hidden.
 */
export const LAYOUT_ATTRIBUTE = {
  TextSize: 'data-text-size',
  Font: 'data-font',
  Density: 'data-density',
  CardPreview: 'data-card-preview',
  CardSite: 'data-card-site',
  CardNotes: 'data-card-notes',
  CardTags: 'data-card-tags',
} as const;
