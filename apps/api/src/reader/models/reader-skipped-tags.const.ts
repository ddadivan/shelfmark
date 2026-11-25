/**
 * Elements never read as article text: scripts, chrome, forms, media and embedded documents.
 * (`<aside>` is chrome unless it is a callout, see `isNoteBox`; images and figures are read as
 * image blocks.)
 */
export const READER_SKIPPED_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'form',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'svg',
  'math',
  'canvas',
  'template',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'video',
  'audio',
  'dialog',
  'menu',
  'link',
  'meta',
  'title',
  'head',
  'base',
]);
