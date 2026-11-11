/**
 * `POST /api/links/batch/update` body: one change for several selected links (bulk actions, #267).
 * At least one change is required; changes may be combined and apply to every link in one transaction.
 */
export interface UpdateLinksBatchRequest {
  /** 1 to `LINK_LIMIT.BatchMax` distinct link ids; foreign, missing and trashed ids are ignored. */
  ids: string[];
  /** Move: UUID of one of the user's live folders, or `null` for "Unsorted". A move unpins from the old folder. */
  folderId?: string | null;
  /**
   * Tag names added to every link (found or created, same rules as `CreateLinkRequest.tags`). A link may end up
   * with at most `LINK_LIMIT.TagsMax` tags, else the whole request is a 409.
   */
  addTags?: string[];
  /** Tag names taken off every link (case-insensitive); unknown names are ignored, tags are never deleted. */
  removeTags?: string[];
  /** Favorite on (`true`) or off (`false`) for every link. */
  isFavorite?: boolean;
}
