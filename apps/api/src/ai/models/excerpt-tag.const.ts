/** Elements whose text is never part of an excerpt: code, chrome and embedded documents. */
export const EXCERPT_SKIPPED_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  'svg',
  'template',
  'iframe',
  'form',
  'select',
  'button',
]);

/** The element that holds the page's content, when the page marks it; the first one found wins. */
export const EXCERPT_CONTENT_TAGS: readonly string[] = ['main', 'article'];
