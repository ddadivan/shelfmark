/** `POST /api/tags/:id/merge` body: moves all links of `:id` onto the target and deletes `:id`. */
export interface MergeTagRequest {
  targetTagId: string;
}
