import type { LinkResponse } from '@shelfmark/contracts';
import type { ADD_LINK_ACTION } from './add-link-action.const';

/** Edit mode: the user pressed Delete; the caller runs the confirm and Undo flow. */
export interface AddLinkDeleteRequested {
  readonly action: typeof ADD_LINK_ACTION.Delete;
  readonly link: LinkResponse;
}
