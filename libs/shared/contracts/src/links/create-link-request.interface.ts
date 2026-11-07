/** `POST /api/links` body. Duplicates are allowed ("save anyway"). */
export interface CreateLinkRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url: string;
  /** At most `LINK_LIMIT.TitleMax`; defaults to the page title (fetched by the server) or the URL. */
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
  /**
   * Client-generated UUID, one per "add link" dialog session. A repeated request with the same key returns
   * the link created by the first one instead of a second copy (retries, double clicks). Unique per user.
   */
  idempotencyKey?: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`), usually from the preview; the server never fetches it. */
  faviconUrl?: string;
  /** Source hint (http(s), at most `LINK_LIMIT.UrlMax`), usually from the preview; the server never fetches it. */
  imageUrl?: string;
}
