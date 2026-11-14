/**
 * `PUT /api/folders/order` body: the live subfolders of one parent (`null` = top level), every one
 * exactly once, in the new order; anything else is a 400. Reordering never moves a folder to
 * another parent (that is `PATCH /api/folders/:id` with `parentId`).
 */
export interface ReorderFoldersRequest {
  parentId: string | null;
  ids: string[];
}
