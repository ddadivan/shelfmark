/** "Folder for all" and "Tags for all" of the paste-many list. */
export interface PasteManyFormModel {
  /** `null` = "Unsorted". */
  folderId: string | null;
  tags: string[];
}
