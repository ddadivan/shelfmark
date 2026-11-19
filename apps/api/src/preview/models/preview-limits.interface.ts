export interface PreviewLimits {
  maxTitleLength: number;
  maxDescriptionLength: number;
  /** Only this many leading characters are parsed; parse5 is quadratic on deeply nested markup. */
  maxParsedChars: number;
  /** Longest image / favicon URL that is returned. */
  maxUrlLength: number;
  /** JSON-LD blocks read for the link kind (#537); later ones are ignored. */
  maxJsonLdScripts: number;
  /** A longer JSON-LD block is skipped unparsed. */
  maxJsonLdChars: number;
  /** Entities (top level and `@graph` members) looked at per block. */
  maxJsonLdEntities: number;
}
