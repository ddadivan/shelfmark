/** Kinds of a `ui-reader` block (the same values as the contracts' `READER_BLOCK_KIND`). */
export const READER_VIEW_BLOCK = {
  Heading: 'heading',
  Paragraph: 'paragraph',
  List: 'list',
  Quote: 'quote',
  Code: 'code',
  Image: 'image',
  Note: 'note',
  Table: 'table',
} as const;
