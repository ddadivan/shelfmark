/** `POST /api/tags/:id/merge` body: moves all links of `:id` onto the target and deletes `:id`. */
export interface MergeTagRequest {
  /** UUID of another tag of the user. */
  targetTagId: string;
}
