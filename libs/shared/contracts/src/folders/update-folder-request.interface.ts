/** `PATCH /api/folders/:id` body. Moving into itself or a descendant is rejected with 400. */
export interface UpdateFolderRequest {
  name?: string;
  /** `null` moves the folder to the top level. */
  parentId?: string | null;
}
