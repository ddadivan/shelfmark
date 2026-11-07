/** Value of the add-link form. */
export interface AddLinkFormModel {
  url: string;
  title: string;
  /** `null` = "Unsorted". */
  folderId: string | null;
  tags: string[];
  note: string;
}
