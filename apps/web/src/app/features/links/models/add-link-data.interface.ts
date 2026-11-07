/** Input of `openAddLinkDialog()`. */
export interface AddLinkData {
  /** The folder that is open in the library; pre-selected in the form. `null` / absent = "Unsorted". */
  readonly folderId?: string | null;
}
