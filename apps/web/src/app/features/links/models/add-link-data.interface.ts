import type { LinkResponse } from '@shelfmark/contracts';

/** Input of `AddLinkDialogService.open()`. */
export interface AddLinkData {
  /** Edit mode: the link to change. The form is prefilled and saving sends only the changed fields. */
  readonly link?: LinkResponse;
  /** The folder that is open in the library; pre-selected in the form. `null` / absent = "Unsorted". */
  readonly folderId?: string | null;
}
