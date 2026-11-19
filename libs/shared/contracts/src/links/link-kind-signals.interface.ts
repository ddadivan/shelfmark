/**
 * What the page said about itself, for `deriveLinkKind` (#537). Every field is optional: a save
 * without a fetched page passes none and the URL alone decides.
 */
export interface LinkKindSignals {
  /** The page's `og:type` meta value, as written. */
  readonly ogType?: string | null;
  /** The response media type without parameters (`application/pdf`), when the URL was fetched. */
  readonly contentType?: string | null;
  /** The schema.org `@type` names of the top-level JSON-LD entities in the head (`Recipe`). */
  readonly schemaTypes?: readonly string[];
}
