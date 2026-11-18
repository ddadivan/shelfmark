import type { LinkResponse } from '@shelfmark/contracts';
import type { ADD_LINK_ACTION } from './add-link-action.const';

/** The link was saved. */
export interface AddLinkSaved {
  readonly action: typeof ADD_LINK_ACTION.Saved;
  readonly link: LinkResponse;
  /** A new link whose folder the user picked (or took from a suggestion): a rule may be offered. */
  readonly folderChosen?: boolean;
}
