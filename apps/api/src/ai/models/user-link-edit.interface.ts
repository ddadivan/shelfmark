/**
 * What a user's `PATCH /api/links/:id` changed, for the suggestion marks: the new folder (`null` =
 * Unsorted) when the folder changed, the new tag names when the tag set changed; absent otherwise.
 */
export interface UserLinkEdit {
  folderId?: string | null;
  tags?: readonly string[];
}
