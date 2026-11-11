import type { LinkBatchItemError, LinkResponse } from '@shelfmark/contracts';
import type { ADD_LINK_ACTION } from './add-link-action.const';

/** Several links were saved at once from the paste-many list (`POST /api/links/batch`). */
export interface AddLinkSavedMany {
  readonly action: typeof ADD_LINK_ACTION.SavedMany;
  /** The saved links in the order they were pasted. */
  readonly links: readonly LinkResponse[];
  /** Items the server skipped (a URL repeated in the batch, or too long once normalised). */
  readonly errors: readonly LinkBatchItemError[];
  /** The folder chosen for all of them; `null` = "Unsorted". */
  readonly folderId: string | null;
}
