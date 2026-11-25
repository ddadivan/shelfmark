/**
 * Kinds of a Reader text block (Shelf Link page, flows-and-structure 5.7). The article text is sent
 * as typed blocks and inline spans, never as HTML, so the web app renders it with its own elements
 * and no `innerHTML`.
 */
export const READER_BLOCK_KIND = {
  Heading: 'heading',
  Paragraph: 'paragraph',
  List: 'list',
  Quote: 'quote',
  Code: 'code',
  Image: 'image',
  /** A callout / admonition (Note, Tip, Warning) with its label. */
  Note: 'note',
  Table: 'table',
} as const;
