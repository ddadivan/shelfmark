/**
 * Settings › Language › Interface language (#274). `browser` follows the browser's language and
 * falls back to English when the app has no translation for it (default). The others are the
 * shipped translations; `pt` uses Brazilian Portuguese conventions,
 * `uk` is Ukrainian (#404).
 */
export const INTERFACE_LANGUAGE = {
  Browser: 'browser',
  En: 'en',
  Fr: 'fr',
  De: 'de',
  It: 'it',
  Es: 'es',
  Pt: 'pt',
  Uk: 'uk',
} as const;
