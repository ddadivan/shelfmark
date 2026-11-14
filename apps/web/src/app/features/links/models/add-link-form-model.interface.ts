/** Value of the add-link form. */
export interface AddLinkFormModel {
  url: string;
  title: string;
  /** `null` = "Unsorted". */
  folderId: string | null;
  tags: string[];
  note: string;
  /** Edit mode only: "Add to favorites". */
  isFavorite: boolean;
  /** Edit mode only: the link kind (one of `LINK_KIND`); `null` only before a choice exists. */
  kind: string | null;
}
