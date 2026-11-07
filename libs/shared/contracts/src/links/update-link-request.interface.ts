/** `PATCH /api/links/:id` body; send only the fields to change. `null` clears note and folder. */
export interface UpdateLinkRequest {
  url?: string;
  title?: string;
  note?: string | null;
  /** `null` moves the link to "Unsorted". */
  folderId?: string | null;
  /** Full replacement list of tag names. */
  tags?: string[];
  isFavorite?: boolean;
}
