/**
 * Limits of the Reader extraction (`extractReaderArticle`): what is parsed, how much is kept and
 * when a page counts as an article. The fetch itself has its own limits (`READER_FETCH_LIMITS`).
 */
export const READER_EXTRACT_LIMIT = {
  /** Characters of HTML that are parsed; the rest is dropped before parse5 sees it. */
  HtmlCharsMax: 1_000_000,
  /** Nodes visited by one walk (scoring, collecting); the rest of the page is ignored. */
  NodesMax: 60_000,
  /** Nesting depth the block walk follows (deeper markup is skipped). */
  DepthMax: 120,
  /** At most this many blocks... */
  BlocksMax: 400,
  /** ...and this many characters of text in all blocks together. */
  TextCharsMax: 100_000,
  /** One paragraph, heading, quote or list item is cut here. */
  BlockCharsMax: 4_000,
  /** One code block is cut here. */
  CodeCharsMax: 8_000,
  /** List items kept per list. */
  ListItemsMax: 100,
  /** A page with fewer words than this has no article (a shop, an app, a login page). */
  WordsMin: 120,
  /** ...or with fewer paragraphs than this. */
  ParagraphsMin: 2,
  /** A paragraph-like element needs this much text to count for scoring. */
  ScoringTextMin: 25,
  /** A short paragraph or list made mostly of link text is chrome ("Read more", related links). */
  LinkDensityMax: 0.6,
  /** Reading speed for `minutes`. */
  WordsPerMinute: 230,
  /** Spans kept in one block. */
  SpansMax: 300,
  /** Nesting of lists kept (deeper items are dropped). */
  ListDepthMax: 4,
  TableRowsMax: 60,
  TableColumnsMax: 10,
  CellCharsMax: 300,
  /** Image blocks kept in one article. */
  ImagesMax: 30,
  /** A link or image address longer than this is dropped. */
  UrlCharsMax: 2048,
  LabelCharsMax: 40,
  AltCharsMax: 300,
  /** A block of text a callout may hold when it is flattened to spans. */
  NoteCharsMax: 1_500,
  /** Content roots tried before the page is read as a whole. */
  RootCandidatesMax: 4,
  TitleCharsMax: 300,
  AuthorCharsMax: 120,
} as const;
