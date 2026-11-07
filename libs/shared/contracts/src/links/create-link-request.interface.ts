/** `POST /api/links` body. Duplicates are allowed ("save anyway"). */
export interface CreateLinkRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /** At most `LINK_LIMIT.TitleMax`; defaults to the preview title or the URL. */
  title?: string;
  /** At most `LINK_LIMIT.NoteMax`. */
  note?: string;
  folderId?: string;
  /** Tag names, at most `TAG_LIMIT.NameMax` each; missing tags are created. */
  tags?: string[];
}
