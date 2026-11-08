/**
 * `PATCH /api/tags/:id` body: rename. Responds 409 when another tag of the user has the name
 * (case-insensitively); changing only the case of the tag's own name is allowed.
 */
export interface UpdateTagRequest {
  /** 1 to `TAG_LIMIT.NameMax` characters; spaces become hyphens; unique case-insensitively. */
  name: string;
}
