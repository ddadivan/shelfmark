/**
 * Limits for link fields (PROJECT.md 6.1). `TagsMax` is the number of tag names per link, `QueryMax` the length
 * of `q`, `QueryTermsMax` the number of words of `q` that are used (extra words are ignored) and `PerUserMax`
 * the number of links one user can save.
 */
export const LINK_LIMIT = {
  UrlMax: 2048,
  TitleMax: 300,
  NoteMax: 2000,
  TagsMax: 20,
  QueryMax: 200,
  QueryTermsMax: 5,
  PerUserMax: 10_000,
} as const;
