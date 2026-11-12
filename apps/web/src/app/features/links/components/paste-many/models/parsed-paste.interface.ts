/** What `parsePastedLinks` found in a pasted text. */
export interface ParsedPaste {
  /** Distinct http(s) links in the order they appear (bare domains get `https://`), at most `LINK_LIMIT.BatchMax`. */
  readonly links: readonly string[];
  /** Lines that held no link, trimmed and shortened, for "Not a link, skipped" (at most `PASTE_SKIPPED_MAX`). */
  readonly skipped: readonly string[];
  /** Distinct links past the limit: they are left out (bigger lists belong to Import). */
  readonly overflow: number;
  /** Distinct links found before the limit was applied (`links.length + overflow`). */
  readonly found: number;
}
