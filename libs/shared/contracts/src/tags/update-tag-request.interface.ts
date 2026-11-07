/** `PATCH /api/tags/:id` body: rename. Responds 409 when the name is taken. */
export interface UpdateTagRequest {
  /** 1 to `TAG_LIMIT.NameMax` characters; spaces become hyphens; unique case-insensitively. */
  name: string;
}
