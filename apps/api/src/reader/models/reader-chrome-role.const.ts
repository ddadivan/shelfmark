/** ARIA roles of page chrome: an element with one of them is never article text. */
export const READER_CHROME_ROLE: ReadonlySet<string> = new Set([
  'navigation',
  'banner',
  'contentinfo',
  'complementary',
  'search',
  'dialog',
  'alertdialog',
  'toolbar',
  'menu',
  'menubar',
  'tablist',
]);
