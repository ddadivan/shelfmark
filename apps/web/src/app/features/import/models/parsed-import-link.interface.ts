/** A link read from an import file: plain text only, nothing is ever rendered as HTML. */
export interface ParsedImportLink {
  /** An http(s) URL of at most `LINK_LIMIT.UrlMax` characters. */
  readonly url: string;
  /** Trimmed, at most `LINK_LIMIT.TitleMax`; absent when the file had none. */
  readonly title?: string;
  /** Key of its folder; `null` = not in a folder of the file. */
  readonly folderKey: string | null;
  readonly tags: readonly string[];
  readonly note?: string;
  /** ISO time it was bookmarked, when the file says so. */
  readonly addedAt?: string;
}
