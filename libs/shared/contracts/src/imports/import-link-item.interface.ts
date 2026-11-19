/** One link of `POST /api/imports/:id/links`. */
export interface ImportLinkItem {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /** At most `LINK_LIMIT.TitleMax`; absent = the URL until the lazy capture fills the page title. */
  title?: string;
  /** Client-generated UUID, one per link of the import; a retried batch replays known keys. */
  idempotencyKey: string;
  /** A live own folder (usually one this import created); absent = the import's target. */
  folderId?: string;
  /** Tag names, the same rules as `CreateLinkRequest.tags`. */
  tags?: string[];
  /** At most `LINK_LIMIT.NoteMax` characters. */
  note?: string;
  /** When it was bookmarked (ISO 8601 with offset); stored as the save date, clamped to the past. */
  addedAt?: string;
}
