/**
 * Limits for link fields (PROJECT.md 6.1). `TagsMax` is the number of tag names per link,
 * `QueryMax` the length of `q`, `TagFilterMax` the number of `tag` values in one list request.
 */
export const LINK_LIMIT = {
  UrlMax: 2048,
  TitleMax: 300,
  NoteMax: 2000,
  TagsMax: 20,
  QueryMax: 200,
  TagFilterMax: 5,
} as const;
