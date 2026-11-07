/** `PATCH /api/tags/:id` body: rename. Responds 409 when the name is taken. */
export interface UpdateTagRequest {
  name: string;
}
