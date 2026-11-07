/** `POST /api/folders` body. */
export interface CreateFolderRequest {
  /** 1 to `FOLDER_LIMIT.NameMax` characters. */
  name: string;
  parentId?: string;
}
