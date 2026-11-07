/** `POST /api/links` body. Duplicates are allowed ("save anyway"). */
export interface CreateLinkRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /** At most `LINK_LIMIT.TitleMax`; defaults to the preview title or the URL. */
  title?: string;
  /** At most `LINK_LIMIT.NoteMax`. */
  note?: string;
  /** UUID of one of the user's folders. */
  folderId?: string;
  /**
   * Tag names, at most `LINK_LIMIT.TagsMax` of them and `TAG_LIMIT.NameMax` characters each; missing tags are
   * created. Names are normalised (spaces become hyphens) and unique case-insensitively.
   */
  tags?: string[];
}
