/** `PATCH /api/links/:id` body; send only the fields to change. `null` clears note and folder. */
export interface UpdateLinkRequest {
  /** http(s) URL, at most `LINK_LIMIT.UrlMax` characters. */
  url?: string;
  /** At most `LINK_LIMIT.TitleMax`. */
  title?: string;
  /** At most `LINK_LIMIT.NoteMax`; `null` clears it. */
  note?: string | null;
  /** UUID of one of the user's folders; `null` moves the link to "Unsorted". */
  folderId?: string | null;
  /**
   * Full replacement list of tag names, at most `LINK_LIMIT.TagsMax` of them and `TAG_LIMIT.NameMax` characters
   * each. Names are normalised (spaces become hyphens) and unique case-insensitively.
   */
  tags?: string[];
  isFavorite?: boolean;
  /**
   * Pin to (`true`) or unpin from (`false`) the top of the link's folder. Pinning needs a folder (400 in Unsorted)
   * and is 409 beyond `LINK_LIMIT.PinnedInFolderMax` in that folder. Moving a link to another folder unpins it.
   */
  pinnedInFolder?: boolean;
}
