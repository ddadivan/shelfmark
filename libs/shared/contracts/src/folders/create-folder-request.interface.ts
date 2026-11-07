/**
 * `POST /api/folders` body. 409 when the user already has `FOLDER_LIMIT.PerUserMax` folders; a
 * foreign `parentId` is a 404.
 */
export interface CreateFolderRequest {
  /** 1 to `FOLDER_LIMIT.NameMax` characters. */
  name: string;
  parentId?: string;
}
