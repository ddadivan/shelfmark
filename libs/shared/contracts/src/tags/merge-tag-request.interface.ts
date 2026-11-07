/**
 * `POST /api/tags/:id/merge` body: moves all links of `:id` onto the target and deletes `:id`.
 * Merging a tag into itself is a 400; an unknown or foreign tag is a 404.
 */
export interface MergeTagRequest {
  /** UUID of another tag of the user. */
  targetTagId: string;
}
