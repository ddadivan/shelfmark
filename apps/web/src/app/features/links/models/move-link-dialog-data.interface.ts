import type { LinkResponse } from '@shelfmark/contracts';

/** What `LinkActionsService` hands to the move dialog. */
export interface MoveLinkDialogData {
  readonly link: LinkResponse;
  /** Called with the chosen folder (`null` = Unsorted) when it differs; the move itself is optimistic. */
  readonly submit: (folderId: string | null) => void;
}
