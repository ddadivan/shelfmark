/** What an export covers; an empty scope is the whole library. The format is chosen separately. */
export interface ExportScope {
  /** A folder and all its subfolders. */
  readonly folderId?: string;
  /** Tag names; a link must have all of them. */
  readonly tags?: readonly string[];
  /** Search text. */
  readonly q?: string;
}
