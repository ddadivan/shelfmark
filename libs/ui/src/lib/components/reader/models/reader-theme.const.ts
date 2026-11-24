/**
 * Page of `ui-reader` (Reading settings › Theme): four fixed palettes, independent of the app
 * theme. Light is the app's light canvas, Dark its dark surface; Sepia and Black are the
 * `reader-sepia-*` and `reader-black-*` tokens. No theme (`null`) follows the app.
 */
export const READER_THEME = {
  Light: 'light',
  Sepia: 'sepia',
  Dark: 'dark',
  Black: 'black',
} as const;
