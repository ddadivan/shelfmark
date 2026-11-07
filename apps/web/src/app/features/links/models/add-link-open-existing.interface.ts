import type { LinkDuplicate } from '@shelfmark/contracts';
import type { ADD_LINK_ACTION } from './add-link-action.const';

/** The user chose to open the already saved link; the caller navigates to it. */
export interface AddLinkOpenExisting {
  readonly action: typeof ADD_LINK_ACTION.OpenExisting;
  readonly existing: LinkDuplicate;
}
